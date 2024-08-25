// This ia a global variable of JS SDK in splunk browser.
// Can't use splunk-sdk npm module, since it relies on nodejs runtime.
declare var splunkjs: any;

// Splunk browser HTTP client uses jquery and needs $ exposed as variable.
import jQuery from "jquery";

export type AllOrString = "-" | string;

export type NamespaceSharing = "user" | "app" | "global" | "system";

export type Namespace = {
  owner: AllOrString;
  app: AllOrString;
  sharing: NamespaceSharing;
};

export interface CollectionService<T> {
  fetch(): Promise<any>;

  list(): T[];
}

export type Index = {
  name: string;
};

export type StoragePassword = {
  name: string;
  realm: string;
  password: string;
};

export interface Entity<T> {
  reload(): Promise<void>;
}

export type Configurations = {};

export interface ConfigurationFileEntity extends Entity<Configurations> {}

export interface IndexesService extends CollectionService<Index> {}

export interface StoragePasswordsService
  extends CollectionService<StoragePassword> {
  createOrReplace(params: StoragePassword): Promise<StoragePassword>;
}

export interface ConfigurationsService
  extends CollectionService<Configurations> {
  createAsync(
    filename: string,
    stanzaName: string,
    keyValueMap: Record<string, string>,
  ): Promise<void>;

  getConfFile(filename: string): Promise<ConfigurationFileEntity>;
}

export interface SplunkJsService {
  storagePasswords(namespace: Namespace): StoragePasswordsService;

  configurations(namespace: Namespace): ConfigurationsService;

  indexes(namespace: Namespace): IndexesService;
}

export class SplunkJs {
  private service: SplunkJsService | undefined = undefined;

  constructor(readonly namespace: Namespace) {}

  getService(): SplunkJsService {
    if (this.service) {
      return this.service;
    }

    // @ts-ignore
    if (!globalThis.splunkjs) {
      console.log(
        "Not running in Splunk browser. Falling back to mocked data.",
      );
      return new MockSplunkJsService();
    }

    // @ts-ignore
    globalThis.$.ajax = jQuery.ajax;

    const http = new splunkjs.SplunkWebHttp();

    this.service = new splunkjs.Service(http, this.namespace);

    return this.service!;
  }
}

class MockSplunkJsService implements SplunkJsService {
  indexes(namespace: Namespace): IndexesService {
    return new MockIndexesService();
  }

  storagePasswords(namespace: Namespace): StoragePasswordsService {
    return new MockStoragePasswordsService();
  }

  configurations(namespace: Namespace): ConfigurationsService {
    return new MockConfigurationsService();
  }
}

class MockIndexesService implements IndexesService {
  fetch(): Promise<any> {
    return Promise.resolve(undefined);
  }

  list(): Index[] {
    return [
      {
        name: "main",
      },
    ];
  }
}

class MockStoragePasswordsService implements StoragePasswordsService {
  fetch(): Promise<any> {
    return Promise.resolve(undefined);
  }

  list(): StoragePassword[] {
    return [
      {
        name: "key",
        password: "secret",
        realm: "app_realm",
      },
    ];
  }

  createOrReplace(params: StoragePassword): Promise<StoragePassword> {
    return Promise.resolve({
      name: "key2",
      password: "secret2",
      realm: "app_realm",
    });
  }
}

class MockConfigurationsService implements ConfigurationsService {
  fetch(): Promise<any> {
    return Promise.resolve(undefined);
  }

  list(): Configurations[] {
    return [];
  }

  createAsync(
    filename: string,
    stanzaName: string,
    keyValueMap: Record<string, string>,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  getConfFile(filename: string): Promise<ConfigurationFileEntity> {
    return Promise.resolve(new MockConfigurationFileEntity());
  }
}

class MockConfigurationFileEntity implements ConfigurationFileEntity {
  reload(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
