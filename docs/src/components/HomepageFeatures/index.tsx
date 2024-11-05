import Heading from "@theme/Heading";
import clsx from "clsx";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
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
    description: <>Let Configarr handle the complex setup of your media applications. From Sonarr to Radarr, we've got you covered.</>,
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
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
