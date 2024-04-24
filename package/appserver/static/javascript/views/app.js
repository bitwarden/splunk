import * as Setup from "./setup_page.js";

define(["react", "splunkjs/splunk"], function(react, splunk_js_sdk){
  const e = react.createElement;

  class SetupPage extends react.Component {
    constructor(props) {
      super(props);

      this.state = {
        clientId: '',
        clientSecret: '',
        index: 'main',
        indexOptions: [],
        serverUrl: 'https://bitwarden.com',
        startDate: ''
      };

      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

    async componentDidMount() {
      const indexes = await Setup.getIndexes(splunk_js_sdk);
      this.state.indexOptions = indexes;
      this.setState({ ...this.state });
    }

    handleChange(event) {
      this.setState({ ...this.state, [event.target.name]: event.target.value});
    }

    async handleSubmit(event) {
      event.preventDefault();
      await Setup.perform(splunk_js_sdk, this.state);
    }

    render() {
      return e("div", null, [
        e("h2", null, "Enter the information below to complete setup."),
        e("div", null, [
          e("form", { onSubmit: this.handleSubmit }, [
            e("h3", null, "Your API key can be found in the Bitwarden organization admin console."),
            e("label", null, [
              "Client Id ",
              e("br"),
              e("input", { type: "text", name: "clientId", value: this.state.clientId, onChange: this.handleChange })
            ]),
            e("label", null, [
              "Client Secret ",
              e("br"),
              e("input", { type: "password", name: "clientSecret", value: this.state.clientSecret, onChange: this.handleChange })
            ]),
            e("h3", null, "Choose a Splunk index for the Bitwarden event logs."),
            e("label", null, [
              "Index ",
              e("br"),
              e(
                "select",
                {
                  name: "index",
                  value: this.state.index,
                  onChange: this.handleChange,
                },
                [
                  this.state.indexOptions.map((i) => {
                    return e("option", { value: i.name }, i.name);
                  }),
                ]
              ),
            ]),
            e("h3", null, "Self-hosted Bitwarden servers may need to reconfigure their installation's URL."),
            e("h4", null, "URLs starting with 'http://' is considered insecure and not allowed in Splunk. Please use 'https://' instead."),
            e("label", null, [
              "Server URL ",
              e("br"),
              e("input", { type: "text", name: "serverUrl", value: this.state.serverUrl, onChange: this.handleChange })
            ]),
            e("h3", null, "Choose the earliest Bitwarden event date to retrieve (Default is 1 year)."),
            e("h4", null, "This is intended to be set only on first time setup. Make sure you have no other Bitwarden events to avoid duplications."),
            e("label", null, [
              "Start date (optional)",
              e("br"),
              e("input", { type: "date", name: "startDate", value: this.state.startDate, onChange: this.handleChange })
            ]),
            e("input", { type: "submit", value: "Submit" })
          ])
        ])
      ]);
    }
  }

  return e(SetupPage);
});
