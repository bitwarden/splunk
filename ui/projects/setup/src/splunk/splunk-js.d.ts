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

export type ConfigurationFileStanza = {};

export interface ConfigurationFileStanzaEntity
  extends ConfigurationFileStanza,
    Entity {
  properties(): Record<string, any>;
}

export type ConfigurationFile = {};

export interface ConfigurationFileEntity
  extends ConfigurationFile,
    Entity,
    CollectionService<ConfigurationFileStanzaEntity> {}

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

export interface SplunkHttp {
  new (url?: string): SplunkHttp;
}

export interface SplunkJsService {
  new (http: SplunkHttp, properties: Record<string, any>): SplunkJsService;

  storagePasswords(namespace: Namespace): StoragePasswordsService;

  configurations(namespace: Namespace): ConfigurationsService;

  indexes(namespace: Namespace): IndexesService;

  apps(namespace: Namespace): AppsService;
}

export interface SplunkJs {
  ProxyHttp: SplunkHttp;
  SplunkWebHttp: SplunkHttp;
  Service: SplunkJsService;

  noConflict(): SplunkJs;
}
