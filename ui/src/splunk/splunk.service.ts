import { Injectable } from "@angular/core";
import { AppConfig } from "../config";
import { ConfigurationFileStanzaEntity, Index } from "./splunk-js";
import { SplunkJsServiceBuilder } from "./splunk-js-service-builder";

/**
 * Service for interacting with Splunk APIs.
 * Provides methods to manage indexes, storage passwords, configuration files, and apps.
 */
@Injectable({
  providedIn: "root",
})
export class SplunkService {
  private readonly globalNamespaceService = new SplunkJsServiceBuilder({
    owner: "-",
    app: "-",
    sharing: "app",
  });
  private readonly bitwardenAppService;

  constructor(config: AppConfig) {
    this.bitwardenAppService = new SplunkJsServiceBuilder({
      owner: "nobody",
      app: config.appName,
      sharing: "app",
    });
  }

  /**
   * Retrieves all available Splunk indexes from the global namespace.
   * @returns A promise that resolves to an array of Index objects.
   */
  async getAllIndexes(): Promise<Index[]> {
    const indexesCollection = this.globalNamespaceService
      .getService()
      .indexes(this.globalNamespaceService.namespace);
    await indexesCollection.fetch();
    return indexesCollection.list();
  }

  /**
   * Creates or updates a storage password in the Splunk storage password collection.
   * @param realm - The realm identifier for the password.
   * @param name - The name/identifier for the password entry.
   * @param password - The password value to store.
   * @returns A promise that resolves when the operation completes.
   */
  async upsertStoragePassword(realm: string, name: string, password: string) {
    const storagePasswordCollection = this.bitwardenAppService
      .getService()
      .storagePasswords(this.bitwardenAppService.namespace);
    await storagePasswordCollection.fetch();
    await storagePasswordCollection.createOrReplace({
      name,
      realm,
      password,
    });
  }

  /**
   * Retrieves a specific stanza from a Splunk configuration file.
   * @param filename - The name of the configuration file (e.g., "inputs", "script").
   * @param stanzaName - The name of the stanza within the configuration file.
   * @returns A promise that resolves to the configuration file stanza entity.
   */
  async getConfigurationFile(
    filename: string,
    stanzaName: string,
  ): Promise<ConfigurationFileStanzaEntity> {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    await configurationsCollection.fetch();
    const configurationFile =
      await configurationsCollection.getConfFile(filename);
    return configurationFile.item(stanzaName);
  }

  /**
   * Creates or updates a stanza in a Splunk configuration file with the provided key-value pairs.
   * @param filename - The name of the configuration file (e.g., "inputs", "script", "app").
   * @param stanzaName - The name of the stanza to create or update.
   * @param keyValueMap - A record of key-value pairs to set in the stanza.
   * @returns A promise that resolves when the operation completes.
   */
  async upsertConfigurationFile(
    filename: string,
    stanzaName: string,
    keyValueMap: Record<string, string>,
  ) {
    const configurationsCollection = this.bitwardenAppService
      .getService()
      .configurations(this.bitwardenAppService.namespace);
    await configurationsCollection.fetch();
    await configurationsCollection.createAsync(
      filename,
      stanzaName,
      keyValueMap,
    );
  }

  /**
   * Reloads a Splunk app to apply configuration changes.
   * @param appName - The name of the Splunk app to reload.
   * @returns A promise that resolves when the reload completes.
   */
  async reloadApp(appName: string) {
    const appsService = this.bitwardenAppService
      .getService()
      .apps(this.bitwardenAppService.namespace);
    await appsService.fetch();
    const app = appsService.item(appName);
    console.debug("App properties", app.properties());
    await app.reload();
  }
}
