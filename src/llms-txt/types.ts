export interface IndexLink {
  readonly title: string;
  readonly url: string;
  readonly description?: string;
}

export interface IndexSection {
  readonly title: string;
  readonly urls: readonly IndexLink[];
}

export interface IndexInput {
  readonly site: {
    readonly name: string;
    readonly url: string;
    readonly tagline: string;
  };
  readonly sections: readonly IndexSection[];
}

export interface FullPage {
  readonly url: string;
  readonly title: string;
  readonly markdown: string;
}
