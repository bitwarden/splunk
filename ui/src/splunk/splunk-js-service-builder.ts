import { isDevMode } from "@angular/core";
import { environment } from "../environments/environment";
import { Namespace, SplunkJs, SplunkJsService } from "./splunk-js";

/**
 * Provider for accessing the SplunkJS library instance.
 * Handles initialization and retrieval of the global SplunkJS object.
 * @internal
 */
class SplunkJsProvider {
  private static splunkJs: SplunkJs | undefined = undefined;

  /**
   * Gets or initializes the SplunkJS library instance.
   * In development mode, uses the global splunkjs object directly.
   * In production, uses noConflict() to avoid namespace collisions.
   * @returns The SplunkJS library instance.
   */
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

/**
 * Builder class for creating and configuring SplunkJS service instances.
 * Handles authentication and HTTP transport configuration based on the environment.
 */
export class SplunkJsServiceBuilder {
  private service: SplunkJsService | undefined = undefined;

  constructor(readonly namespace: Namespace) {}

  /**
   * Gets or creates a SplunkJS service instance for the configured namespace.
   * In development mode, uses ProxyHttp with credentials from environment variables.
   * In production, uses SplunkWebHttp for browser-based authentication.
   * @returns The configured SplunkJS service instance.
   */
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
