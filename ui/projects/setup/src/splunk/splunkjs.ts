// import * from "splunk-sdk/client/splunk";
import jQuery from "jquery";
import { isDevMode } from "@angular/core";

export type AllOrString = "-" | string;

export type NamespaceSharing = "user" | "app" | "global" | "system";

export type Namespace = {
  owner: AllOrString;
  app: AllOrString;
  sharing: NamespaceSharing;
};

export interface Entity {
  reload(): Promise<void>;
}

export interface CollectionService<T extends Entity> {
  fetch(): Promise<any>;

  item(name: string): T;

  list(): T[];
}

export type Index = {
  name: string;
};

export interface IndexEntity extends Index, Entity {}

export type StoragePassword = {
  name: string;
  realm: string;
  password: string;
};

export interface StoragePasswordEntity extends StoragePassword, Entity {}

export type Configuration = {};

export interface ConfigurationEntity extends Configuration, Entity {}

export type ConfigurationStanza = {
  index: string;
};

export interface ConfigurationStanzaEntity
  extends ConfigurationStanza,
    Entity {}

export type ConfigurationFile = {};

export interface ConfigurationFileEntity
  extends ConfigurationFile,
    Entity,
    CollectionService<ConfigurationStanzaEntity> {}

export interface AppEntity extends Entity {}

export interface IndexesService extends CollectionService<IndexEntity> {}

export interface StoragePasswordsService
  extends CollectionService<StoragePasswordEntity> {
  createOrReplace(params: StoragePassword): Promise<StoragePassword>;
}

export interface ConfigurationsService
  extends CollectionService<ConfigurationEntity> {
  createAsync(
    filename: string,
    stanzaName: string,
    keyValueMap: Record<string, string>,
  ): Promise<void>;

  getConfFile(filename: string): Promise<ConfigurationFileEntity>;
}

export interface AppsService extends CollectionService<AppEntity> {
  reload(): Promise<void>;
}

export interface SplunkJsService {
  storagePasswords(namespace: Namespace): StoragePasswordsService;

  configurations(namespace: Namespace): ConfigurationsService;

  indexes(namespace: Namespace): IndexesService;

  apps(namespace: Namespace): AppsService;
}

export class SplunkJs {
  private service: SplunkJsService | undefined = undefined;

  constructor(readonly namespace: Namespace) {}

  getService(): SplunkJsService {
    if (this.service) {
      return this.service;
    }

    // @ts-ignore
    globalThis.$.ajax = jQuery.ajax;

    // @ts-ignore
    let splunkjs = globalThis.splunkjs;

    if (isDevMode()) {
      const http = new splunkjs.ProxyHttp("http://localhost:8089");

      const parameters = {
        ...this.namespace,
        username: "admin",
        password: "password",
      };

      this.service = new splunkjs.Service(http, parameters);
    } else {
      splunkjs = splunkjs.noConflict();

      const http = new splunkjs.SplunkWebHttp();

      this.service = new splunkjs.Service(http, this.namespace);
    }

    return this.service!;
  }
}
