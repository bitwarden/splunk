import { isDevMode } from "@angular/core";
import { environment } from "../environments/environment";
import { Namespace, SplunkJs, SplunkJsService } from "./splunk-js";

class SplunkJsProvider {
  private static splunkJs: SplunkJs | undefined = undefined;

  static get(): SplunkJs {
    if (this.splunkJs) {
      return this.splunkJs;
    }

    if (isDevMode()) {
      // @ts-ignore
      this.splunkJs = globalThis.splunkjs;
    } else {
      // @ts-ignore
      this.splunkJs = globalThis.splunkjs.noConflict();
    }

    return this.splunkJs!;
  }
}

export class SplunkJsServiceBuilder {
  private service: SplunkJsService | undefined = undefined;

  constructor(readonly namespace: Namespace) {}

  getService(): SplunkJsService {
    if (this.service) {
      return this.service;
    }

    const splunkJs = SplunkJsProvider.get();

    if (isDevMode()) {
      const http = new splunkJs.ProxyHttp(environment.splunkManagementUrl);

      const parameters = {
        ...this.namespace,
        username: environment.splunkManagementUsername,
        password: environment.splunkManagementPassword,
      };

      this.service = new splunkJs.Service(http, parameters);
    } else {
      const http = new splunkJs.SplunkWebHttp();

      this.service = new splunkJs.Service(http, this.namespace);
    }

    return this.service!;
  }
}
