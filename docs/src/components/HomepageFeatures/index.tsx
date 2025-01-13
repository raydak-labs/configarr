import Heading from "@theme/Heading";
import clsx from "clsx";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg?: React.ComponentType<React.ComponentProps<"svg">>;
  imageUrl?: string;
  imageAlt?: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Easy Configuration",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: <>Configure your entire media stack with a single YAML file. Simple, intuitive, and powerful configuration options.</>,
  },
  {
    title: "Multi-Platform Support",
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    description: (
      <>
        Run Configarr anywhere with our Docker container or deploy it on Kubernetes. Perfect for both home servers and cloud environments.
      </>
    ),
  },
  {
    title: "Automated Setup",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>
        Let Configarr handle the complex setup of your media applications. From Sonarr,Radarr,Lidarr,Readarr, Whisparr: we've got you
        covered!
      </>
    ),
  },
  {
    title: "TRaSH-Guides Support",
    imageUrl: require("@site/static/img/trash_logo.webp").default, //"https://trash-guides.info/img/logo.png" ,
    imageAlt: "Logo of TRaSH-Guides",
    description: (
      <>
        Seamlessly integrate TRaSH-Guides into your workflow with robust support for its comprehensive documentation and automation tools.
        Effortlessly configure QualityProfiles, CustomFormats, and other advanced settings to optimize your media management experience,
        ensuring precise and efficient handling of your library.
      </>
    ),
  },
  {
    title: "Experimental support",
    Svg: require("@site/static/img/experiment.svg").default,
    description: (
      <>
        Explore cutting-edge features with experimental support for popular Arr tools like Readarr, Lidarr, and Whisparr. Stay ahead of the
        curve by testing innovative functionalities designed to enhance your media automation and management capabilities.
      </>
    ),
  },
  {
    title: "Community Driven",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>Written for the community and working with the community to provide the best experience for managing your media stack!</>
    ),
  },
];

function Feature({ title, Svg, description, imageUrl, imageAlt }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        {Svg ? <Svg className={styles.featureSvg} role="img" /> : <img src={imageUrl} className={styles.featureSvg} alt={imageAlt} />}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
