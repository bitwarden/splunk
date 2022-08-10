import * as Setup from "./store_secret.js";

define(["react", "splunkjs/splunk"], function(react, splunk_js_sdk){
  const e = react.createElement;

  class SetupPage extends react.Component {
    constructor(props) {
      super(props);

      this.state = {
        clientId: '',
        clientSecret: ''
      };

      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
      this.setState({ ...this.state, [event.target.name]: event.target.value})
    }

    async handleSubmit(event) {
      event.preventDefault();

      await Setup.perform(splunk_js_sdk, this.state)
    }

    render() {
      return e("div", null, [
        e("h2", null, "Enter your Bitwarden API key to complete setup."),
        e("div", null, [
          e("form", { onSubmit: this.handleSubmit }, [
            e("label", null, [
              "Client Id ",
              e("input", { type: "text", name: "clientId", value: this.state.clientId, onChange: this.handleChange })
            ]),
            e("label", null, [
              "Client Secret ",
              e("input", { type: "password", name: "clientSecret", value: this.state.clientSecret, onChange: this.handleChange })
            ]),
            e("input", { type: "submit", value: "Submit" })
          ])
        ])
      ]);
    }
  }

  return e(SetupPage);
});
