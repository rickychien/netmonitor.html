const CodeMirror = require("codemirror");
const {
  createClass,
  DOM,
  PropTypes,
} = require("react");

require("codemirror/lib/codemirror.css");
require("codemirror/mode/javascript/javascript");
require("codemirror/mode/htmlmixed/htmlmixed");
require("codemirror/mode/coffeescript/coffeescript");
require("codemirror/mode/jsx/jsx");
require("codemirror/mode/elm/elm");
require("codemirror/mode/clojure/clojure");
require("./codemirror-mozilla.css");

const { div } = DOM;

const SYNTAX_HIGHLIGHT_MAX_SIZE = 102400;

/**
 * CodeMirror editor as a React component
 */
const Editor = createClass({
  displayName: "Editor",

  propTypes: {
    // Source editor syntax hightligh mode, which is a mime type defined in CodeMirror
    mode: PropTypes.string,
    // Source editor is displayed if set to true
    open: PropTypes.bool,
    // Source editor content
    text: PropTypes.string,
  },

  getDefaultProps() {
    return {
      mode: null,
      open: true,
      text: "",
    };
  },

  componentDidMount() {
    const { mode, text } = this.props;

    this.editor = new CodeMirror(this.refs.editorElement, {
      lineNumbers: true,
      mode: text.length < SYNTAX_HIGHLIGHT_MAX_SIZE ? mode : null,
      readOnly: true,
      value: text,
    });
  },

  componentDidUpdate(prevProps) {
    const { mode, open, text } = this.props;

    if (!open) {
      return;
    }

    if (prevProps.mode !== mode && text.length < SYNTAX_HIGHLIGHT_MAX_SIZE) {
      this.editor.setMode(mode);
    }

    if (prevProps.text !== text) {
      // FIXME: Workaround for browser_net_accessibility test to
      // make sure editor node exists while setting editor text.
      // deferEditor workaround should be removed in bug 1308442
      if (this.refs.editorElement) {
        this.editor.setText(text);
      }
    }
  },

  componentWillUnmount() {
    // Unlink the current document.
    if (this.editor.doc) {
      this.editor.doc.cm = null;
    }
  },

  render() {
    const { open } = this.props;

    return (
      div({ className: "editor-container devtools-monospace" },
        div({
          ref: "editorElement",
          className: "editor-mount devtools-monospace",
          // Using visibility instead of display property to avoid breaking
          // CodeMirror indentation
          style: { visibility: open ? "visible" : "hidden" },
        }),
      )
    );
  }
});

module.exports = Editor;
