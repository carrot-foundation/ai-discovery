import { organization } from "../jsonld/organization.js";
import { person } from "../jsonld/person.js";
import { schemaId } from "../jsonld/types.js";

const CARROT_SITE_URL = "https://www.carrot.eco";

export interface CarrotFounder {
  /** Stable `@id`, anchored on carrot.eco. */
  readonly id: string;
  readonly name: string;
  readonly jobTitle: string;
  readonly url: string;
  readonly sameAs: readonly string[];
}

export interface CarrotOrganization {
  /** Stable `@id` every Carrot site already publishes for the organization. */
  readonly id: string;
  readonly name: string;
  readonly alternateName: string;
  /** Where the organization canonically lives; also the root of its `@id`. */
  readonly url: string;
  readonly logo: string;
  /** Also the tagline for `llms.txt` headers. */
  readonly description: string;
  /** Profiles Carrot itself runs. Personal profiles belong on a `Person`. */
  readonly sameAs: readonly string[];
}

/** Ian McKee, president and co-founder of Carrot. */
export const CARROT_FOUNDER: CarrotFounder = Object.freeze({
  id: schemaId(CARROT_SITE_URL, "person", "ian-mckee"),
  name: "Ian McKee",
  jobTitle: "President",
  url: "https://ianmckee.com",
  sameAs: Object.freeze(["https://ianmckee.substack.com/"]),
});

/** The one Carrot entity every Carrot site and `llms.txt` header asserts. */
export const CARROT_ORGANIZATION: CarrotOrganization = Object.freeze({
  id: schemaId(CARROT_SITE_URL, "org"),
  name: "Carrot",
  alternateName: "Carrot Foundation",
  url: CARROT_SITE_URL,
  logo: `${CARROT_SITE_URL}/carrot-brand-originalcolor.svg`,
  description:
    "Carrot is building digital public infrastructure for the low-carbon circular economy.",
  sameAs: Object.freeze([
    "https://www.linkedin.com/company/carrot-network/",
    "https://www.instagram.com/carrot.eco/",
    "https://www.youtube.com/@carrot-eco",
    "https://github.com/carrot-foundation",
  ]),
});

/** `Person` JSON-LD node for Carrot's founder. */
export const carrotFounder = (): Record<string, unknown> =>
  person({ ...CARROT_FOUNDER, sameAs: [...CARROT_FOUNDER.sameAs] });

/**
 * `Organization` JSON-LD node for Carrot, with its founder embedded. Its `@id`
 * is the one the Carrot sites already publish, so every site describes the
 * same node.
 */
export const carrotOrganization = (): Record<string, unknown> =>
  organization({
    ...CARROT_ORGANIZATION,
    sameAs: [...CARROT_ORGANIZATION.sameAs],
    founder: carrotFounder(),
  });
