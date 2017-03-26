// FIXME:
// const { TimelineFront } = require("devtools/shared/fronts/timeline");
function TimelineFront() {
  this.on = this.start = this.off = this.destroy = () => {};
  return this;
};
const { Services } = require("devtools-modules");
const { ACTIVITY_TYPE, EVENTS } = require("../constants");
const { getRequestById, getDisplayedRequestById } = require("../selectors");
const { CurlUtils } = require("../shared/curl");
const { fetchHeaders, formDataURI } = require("../utils/request-utils");

class FirefoxConnector {
  constructor() {
    this.willNavigate = this.willNavigate.bind(this);
    this.close = this.close.bind(this);
    this.displayCachedEvents = this.displayCachedEvents.bind(this);
    this.onDocLoadingMarker = this.onDocLoadingMarker.bind(this);
    this.addRequest = this.addRequest.bind(this);
    this.updateRequest = this.updateRequest.bind(this);
    this.onNetworkEvent = this.onNetworkEvent.bind(this);
    this.onNetworkEventUpdate = this.onNetworkEventUpdate.bind(this);
    this.onRequestHeaders = this.onRequestHeaders.bind(this);
    this.onRequestCookies = this.onRequestCookies.bind(this);
    this.onRequestPostData = this.onRequestPostData.bind(this);
    this.onSecurityInfo = this.onSecurityInfo.bind(this);
    this.onResponseHeaders = this.onResponseHeaders.bind(this);
    this.onResponseCookies = this.onResponseCookies.bind(this);
    this.onResponseContent = this.onResponseContent.bind(this);
    this.onEventTimings = this.onEventTimings.bind(this);
    this.getString = this.getString.bind(this);
    this.triggerActivity = this.triggerActivity.bind(this);
    this.inspectRequest = this.inspectRequest.bind(this);
  }

  connect(connection, actions, store) {
    this.actions = actions;
    this.store = store;
    this.tabTarget = connection.client.getTabTarget();
    this.tabClient = this.tabTarget.isTabActor ? this.tabTarget.activeTab : null;

    this.tabTarget.on("will-navigate", this.willNavigate);
    this.tabTarget.on("close", this.close);

    this.webConsoleClient = this.tabTarget.activeConsole;
    this.webConsoleClient.on("networkEvent", this.onNetworkEvent);
    this.webConsoleClient.on("networkEventUpdate", this.onNetworkEventUpdate);

    // Don't start up waiting for timeline markers if the server isn't
    // recent enough to emit the markers we're interested in.
    if (this.tabTarget.getTrait("documentLoadingMarkers")) {
      this.timelineFront =
        new TimelineFront(this.tabTarget.client, this.tabTarget.form);
      this.timelineFront.on("doc-loading", this.onDocLoadingMarker);
      this.timelineFront.start({ withDocLoadingEvents: true });
    }

    this.displayCachedEvents();
  }

  willNavigate() {
    if (!Services.prefs.getBoolPref("devtools.webconsole.persistlog")) {
      this.actions.batchReset();
      this.actions.clearRequests();
    } else {
      // If the log is persistent, just clear all accumulated timing markers.
      this.actions.clearTimingMarkers();
    }
  }

  close() {
    this.actions.batchReset();

    this.webConsoleClient.off("networkEvent", this.onNetworkEvent);
    this.webConsoleClient.off("networkEventUpdate", this.onNetworkEventUpdate);

    // The timeline front wasn't initialized and started if the server wasn't
    // recent enough to emit the markers we were interested in.
    if (this.tabTarget.getTrait("documentLoadingMarkers")) {
      this.timelineFront.off("doc-loading", this.onDocLoadingMarker);
      this.timelineFront.destroy();
      this.timelineFront = null;
    }

    // When debugging local or a remote instance, the connection is closed by
    // the RemoteTarget. The webconsole actor is stopped on disconnect.
    this.tabClient = null;
    this.webConsoleClient = null;
  }

  /**
   * Display any network events already in the cache.
   */
  displayCachedEvents() {
    for (let networkInfo of this.webConsoleClient.getNetworkEvents()) {
      // First add the request to the timeline.
      this.onNetworkEvent("networkEvent", networkInfo);
      // Then replay any updates already received.
      for (let updateType of networkInfo.updates) {
        this.onNetworkEventUpdate("networkEventUpdate", {
          packet: { updateType },
          networkInfo,
        });
      }
    }
  }

  /**
   * The "DOMContentLoaded" and "Load" events sent by the timeline actor.
   * @param object marker
   */
  onDocLoadingMarker(marker) {
    window.emit(EVENTS.TIMELINE_EVENT, marker);
    this.actions.addTimingMarker(marker);
  }

  addRequest(id, data) {
    let {
      method,
      url,
      isXHR,
      cause,
      startedDateTime,
      fromCache,
      fromServiceWorker,
    } = data;

    this.actions.addRequest(
      id,
      {
        // Convert the received date/time string to a unix timestamp.
        startedMillis: Date.parse(startedDateTime),
        method,
        url,
        isXHR,
        cause,
        fromCache,
        fromServiceWorker,
      },
      true,
    )
    .then(() => window.emit(EVENTS.REQUEST_ADDED, id));
  }

  async updateRequest(id, data) {
    await this.actions.updateRequest(id, data, true);
    let {
      responseContent,
      responseCookies,
      responseHeaders,
      requestCookies,
      requestHeaders,
      requestPostData,
    } = data;
    let request = getRequestById(this.store.getState(), id);

    if (requestHeaders && requestHeaders.headers && requestHeaders.headers.length) {
      let headers = await fetchHeaders(requestHeaders, this.getString);
      if (headers) {
        await this.actions.updateRequest(
          id,
          { requestHeaders: headers },
          true,
        );
      }
    }

    if (responseHeaders && responseHeaders.headers && responseHeaders.headers.length) {
      let headers = await fetchHeaders(responseHeaders, this.getString);
      if (headers) {
        await this.actions.updateRequest(
          id,
          { responseHeaders: headers },
          true,
        );
      }
    }

    if (request && responseContent && responseContent.content) {
      let { mimeType } = request;
      let { text, encoding } = responseContent.content;
      let response = await this.getString(text);
      let payload = {};

      if (mimeType.includes("image/")) {
        payload.responseContentDataUri = formDataURI(mimeType, encoding, response);
      }

      responseContent.content.text = response;
      payload.responseContent = responseContent;

      await this.actions.updateRequest(id, payload, true);

      if (mimeType.includes("image/")) {
        window.emit(EVENTS.RESPONSE_IMAGE_THUMBNAIL_DISPLAYED);
      }
    }

    // Search the POST data upload stream for request headers and add
    // them as a separate property, different from the classic headers.
    if (requestPostData && requestPostData.postData) {
      let { text } = requestPostData.postData;
      let postData = await this.getString(text);
      const headers = CurlUtils.getHeadersFromMultipartText(postData);
      const headersSize = headers.reduce((acc, { name, value }) => {
        return acc + name.length + value.length + 2;
      }, 0);
      let payload = {};
      requestPostData.postData.text = postData;
      payload.requestPostData = Object.assign({}, requestPostData);
      payload.requestHeadersFromUploadStream = { headers, headersSize };

      await this.actions.updateRequest(id, payload, true);
    }

    // Fetch request and response cookies long value.
    // Actor does not provide full sized cookie value when the value is too long
    // To display values correctly, we need fetch them in each request.
    if (requestCookies) {
      let reqCookies = [];
      // request store cookies in requestCookies or requestCookies.cookies
      let cookies = requestCookies.cookies ?
        requestCookies.cookies : requestCookies;
      // make sure cookies is iterable
      if (typeof cookies[Symbol.iterator] === "function") {
        for (let cookie of cookies) {
          reqCookies.push(Object.assign({}, cookie, {
            value: await this.getString(cookie.value),
          }));
        }
        if (reqCookies.length) {
          await this.actions.updateRequest(
            id,
            { requestCookies: reqCookies },
            true,
          );
        }
      }
    }

    if (responseCookies) {
      let resCookies = [];
      // response store cookies in responseCookies or responseCookies.cookies
      let cookies = responseCookies.cookies ?
        responseCookies.cookies : responseCookies;
      // make sure cookies is iterable
      if (typeof cookies[Symbol.iterator] === "function") {
        for (let cookie of cookies) {
          resCookies.push(Object.assign({}, cookie, {
            value: await this.getString(cookie.value),
          }));
        }
        if (resCookies.length) {
          await this.actions.updateRequest(
            id,
            { responseCookies: resCookies },
            true,
          );
        }
      }
    }
  }

  /**
   * The "networkEvent" message type handler.
   *
   * @param string type
   *        Message type.
   * @param object networkInfo
   *        The network request information.
   */
  onNetworkEvent(type, networkInfo) {
    let {
      actor,
      startedDateTime,
      request: { method, url },
      isXHR,
      cause,
      fromCache,
      fromServiceWorker,
    } = networkInfo;

    this.addRequest(
      actor, {
        startedDateTime,
        method,
        url,
        isXHR,
        cause,
        fromCache,
        fromServiceWorker,
      }
    );

    window.emit(EVENTS.NETWORK_EVENT, actor);
  }

  /**
   * The "networkEventUpdate" message type handler.
   *
   * @param string type
   *        Message type.
   * @param object packet
   *        The message received from the server.
   * @param object networkInfo
   *        The network request information.
   */
  onNetworkEventUpdate(type, { packet, networkInfo }) {
    let { actor } = networkInfo;

    switch (packet.updateType) {
      case "requestHeaders":
        this.webConsoleClient.getRequestHeaders(actor,
          this.onRequestHeaders);
        window.emit(EVENTS.UPDATING_REQUEST_HEADERS, actor);
        break;
      case "requestCookies":
        this.webConsoleClient.getRequestCookies(actor,
          this.onRequestCookies);
        window.emit(EVENTS.UPDATING_REQUEST_COOKIES, actor);
        break;
      case "requestPostData":
        this.webConsoleClient.getRequestPostData(actor,
          this.onRequestPostData);
        window.emit(EVENTS.UPDATING_REQUEST_POST_DATA, actor);
        break;
      case "securityInfo":
        this.updateRequest(actor, {
          securityState: networkInfo.securityInfo,
        });
        this.webConsoleClient.getSecurityInfo(actor,
          this.onSecurityInfo);
        window.emit(EVENTS.UPDATING_SECURITY_INFO, actor);
        break;
      case "responseHeaders":
        this.webConsoleClient.getResponseHeaders(actor,
          this.onResponseHeaders);
        window.emit(EVENTS.UPDATING_RESPONSE_HEADERS, actor);
        break;
      case "responseCookies":
        this.webConsoleClient.getResponseCookies(actor,
          this.onResponseCookies);
        window.emit(EVENTS.UPDATING_RESPONSE_COOKIES, actor);
        break;
      case "responseStart":
        this.updateRequest(actor, {
          httpVersion: networkInfo.response.httpVersion,
          remoteAddress: networkInfo.response.remoteAddress,
          remotePort: networkInfo.response.remotePort,
          status: networkInfo.response.status,
          statusText: networkInfo.response.statusText,
          headersSize: networkInfo.response.headersSize,
        });
        window.emit(EVENTS.STARTED_RECEIVING_RESPONSE, actor);
        break;
      case "responseContent":
        this.updateRequest(actor, {
          contentSize: networkInfo.response.bodySize,
          transferredSize: networkInfo.response.transferredSize,
          mimeType: networkInfo.response.content.mimeType,
        });
        this.webConsoleClient.getResponseContent(actor,
          this.onResponseContent);
        window.emit(EVENTS.UPDATING_RESPONSE_CONTENT, actor);
        break;
      case "eventTimings":
        this.updateRequest(actor, {
          totalTime: networkInfo.totalTime
        });
        this.webConsoleClient.getEventTimings(actor,
          this.onEventTimings);
        window.emit(EVENTS.UPDATING_EVENT_TIMINGS, actor);
        break;
    }
  }

  /**
   * Handles additional information received for a "requestHeaders" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestHeaders(response) {
    this.updateRequest(response.from, {
      requestHeaders: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_REQUEST_HEADERS, response.from);
    });
  }

  /**
   * Handles additional information received for a "requestCookies" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestCookies(response) {
    this.updateRequest(response.from, {
      requestCookies: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_REQUEST_COOKIES, response.from);
    });
  }

  /**
   * Handles additional information received for a "requestPostData" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestPostData(response) {
    this.updateRequest(response.from, {
      requestPostData: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_REQUEST_POST_DATA, response.from);
    });
  }

  /**
   * Handles additional information received for a "securityInfo" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onSecurityInfo(response) {
    this.updateRequest(response.from, {
      securityInfo: response.securityInfo
    }).then(() => {
      window.emit(EVENTS.RECEIVED_SECURITY_INFO, response.from);
    });
  }

  /**
   * Handles additional information received for a "responseHeaders" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseHeaders(response) {
    this.updateRequest(response.from, {
      responseHeaders: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_RESPONSE_HEADERS, response.from);
    });
  }

  /**
   * Handles additional information received for a "responseCookies" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseCookies(response) {
    this.updateRequest(response.from, {
      responseCookies: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_RESPONSE_COOKIES, response.from);
    });
  }

  /**
   * Handles additional information received for a "responseContent" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseContent(response) {
    this.updateRequest(response.from, {
      responseContent: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_RESPONSE_CONTENT, response.from);
    });
  }

  /**
   * Handles additional information received for a "eventTimings" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onEventTimings(response) {
    this.updateRequest(response.from, {
      eventTimings: response
    }).then(() => {
      window.emit(EVENTS.RECEIVED_EVENT_TIMINGS, response.from);
    });
  }

  /**
   * Fetches the full text of a LongString.
   *
   * @param object | string stringGrip
   *        The long string grip containing the corresponding actor.
   *        If you pass in a plain string (by accident or because you're lazy),
   *        then a promise of the same string is simply returned.
   * @return object Promise
   *         A promise that is resolved when the full string contents
   *         are available, or rejected if something goes wrong.
   */
  getString(stringGrip) {
    return this.webConsoleClient.getString(stringGrip);
  }

  /**
   * Triggers a specific "activity" to be performed by the frontend.
   * This can be, for example, triggering reloads or enabling/disabling cache.
   *
   * @param number type
   *        The activity type. See the ACTIVITY_TYPE const.
   * @return object
   *         A promise resolved once the activity finishes and the frontend
   *         is back into "standby" mode.
   */
  triggerActivity(type) {
    // Puts the frontend into "standby" (when there's no particular activity).
    let standBy = () => {
      this._currentActivity = ACTIVITY_TYPE.NONE;
    };

    // Waits for a series of "navigation start" and "navigation stop" events.
    let waitForNavigation = () => {
      return new Promise((resolve) => {
        this.tabTarget.once("will-navigate", () => {
          this.tabTarget.once("navigate", () => {
            resolve();
          });
        });
      });
    };

    // Reconfigures the tab, optionally triggering a reload.
    let reconfigureTab = options => {
      return new Promise((resolve) => {
        this.tabTarget.activeTab.reconfigure(options, resolve);
      });
    };

    // Reconfigures the tab and waits for the target to finish navigating.
    let reconfigureTabAndWaitForNavigation = options => {
      options.performReload = true;
      let navigationFinished = waitForNavigation();
      return reconfigureTab(options).then(() => navigationFinished);
    };
    if (type == ACTIVITY_TYPE.RELOAD.WITH_CACHE_DEFAULT) {
      return reconfigureTabAndWaitForNavigation({}).then(standBy);
    }
    if (type == ACTIVITY_TYPE.RELOAD.WITH_CACHE_ENABLED) {
      this._currentActivity = ACTIVITY_TYPE.ENABLE_CACHE;
      this.tabTarget.once("will-navigate", () => {
        this._currentActivity = type;
      });
      return reconfigureTabAndWaitForNavigation({
        cacheDisabled: false,
        performReload: true
      }).then(standBy);
    }
    if (type == ACTIVITY_TYPE.RELOAD.WITH_CACHE_DISABLED) {
      this._currentActivity = ACTIVITY_TYPE.DISABLE_CACHE;
      this.tabTarget.once("will-navigate", () => {
        this._currentActivity = type;
      });
      return reconfigureTabAndWaitForNavigation({
        cacheDisabled: true,
        performReload: true
      }).then(standBy);
    }
    if (type == ACTIVITY_TYPE.ENABLE_CACHE) {
      this._currentActivity = type;
      return reconfigureTab({
        cacheDisabled: false,
        performReload: false
      }).then(standBy);
    }
    if (type == ACTIVITY_TYPE.DISABLE_CACHE) {
      this._currentActivity = type;
      return reconfigureTab({
        cacheDisabled: true,
        performReload: false
      }).then(standBy);
    }
    this._currentActivity = ACTIVITY_TYPE.NONE;
    return Promise.reject(new Error("Invalid activity type"));
  }

  /**
   * Selects the specified request in the waterfall and opens the details view.
   *
   * @param string requestId
   *        The actor ID of the request to inspect.
   * @return object
   *         A promise resolved once the task finishes.
   */
  inspectRequest(requestId) {
    // Look for the request in the existing ones or wait for it to appear, if
    // the network monitor is still loading.
    return new Promise((resolve) => {
      let request = null;
      let inspector = function () {
        request = getDisplayedRequestById(this.store.getState(), requestId);
        if (!request) {
          // Reset filters so that the request is visible.
          this.actions.toggleRequestFilterType("all");
          request = getDisplayedRequestById(this.store.getState(), requestId);
        }

        // If the request was found, select it. Otherwise this function will be
        // called again once new requests arrive.
        if (request) {
          window.off(EVENTS.REQUEST_ADDED, inspector);
          this.actions.selectRequest(request.id);
          resolve();
        }
      };

      inspector();

      if (!request) {
        window.on(EVENTS.REQUEST_ADDED, inspector);
      }
    });
  }

  /**
   * Getter that tells if the server supports sending custom network requests.
   * @type boolean
   */
  get supportsCustomRequest() {
    return this.webConsoleClient &&
      this.webConsoleClient.traits.customNetworkRequest;
  }

  /**
   * Getter that tells if the server includes the transferred (compressed /
   * encoded) response size.
   * @type boolean
   */
  get supportsTransferredResponseSize() {
    return this.webConsoleClient &&
      this.webConsoleClient.traits.transferredResponseSize;
  }

  /**
   * Getter that tells if the server can do network performance statistics.
   * @type boolean
   */
  get supportsPerfStats() {
    return this.tabClient && this.tabClient.traits.reconfigure;
  }

  /**
   * Open a given source in Debugger
   */
  viewSourceInDebugger(sourceURL, sourceLine) {
    return this.toolbox.viewSourceInDebugger(sourceURL, sourceLine);
  }
};

module.exports = new FirefoxConnector();
