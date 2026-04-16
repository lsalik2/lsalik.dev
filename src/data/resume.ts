// Source of truth for this file: public/resume.pdf.
//
// PDF parsing isn't available in the Vercel edge runtime, so the resume
// content is mirrored here by hand. When the PDF changes, update both
// files — the tests will still pass because they only check presence of
// the fields below, but the rendered /resume output will drift from the
// downloadable PDF if you forget this step.

export interface ResumeJob {
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly dates: string;
  readonly bullets: readonly string[];
}

export interface ResumeEducation {
  readonly degree: string;
  readonly school: string;
  readonly bullets: readonly string[];
}

export interface ResumeSkillCategory {
  readonly label: string;
  readonly items: readonly string[];
}

export interface ResumeLink {
  readonly label: string;
  readonly url: string;
}

export interface Resume {
  readonly name: string;
  readonly location: string;
  readonly links: readonly ResumeLink[];
  readonly experience: readonly ResumeJob[];
  readonly education: readonly ResumeEducation[];
  readonly skills: readonly ResumeSkillCategory[];
}

export const RESUME: Resume = {
  name: 'Luis Salik',
  location: 'Chicago, IL',
  links: [
    { label: 'lsalik.dev', url: 'https://lsalik.dev' },
    { label: 'linkedin.com/in/luis-salik', url: 'https://linkedin.com/in/luis-salik' },
  ],
  experience: [
    {
      title: 'Data Integration Engineer',
      company: 'MW Components',
      location: 'Chicago, IL',
      dates: 'December 2025 - Present',
      bullets: [
        'Engineered time-series forecasting pipelines using ARIMA and Random Forest models, identifying 200 anomalies in manufacturing data, improving predictive accuracy by 30%.',
        'Designed and deployed an interactive Streamlit dashboard to deliver key insights to the Executive Leadership Team, streamlining reports and eliminating past-due orders by 80%.',
        'Refactored website architecture and integrated Typesense for optimized search indexing, accelerating page load speeds by 40% and boosting organic SEO traffic by 25%.',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'Valor Esports',
      location: 'Remote',
      dates: 'December 2023 - December 2025',
      bullets: [
        'Created and led high-performance programs and interactive workshops, driving global client acquisition, with over 100 clients from North America, Europe, Oceania and the Middle East.',
        "Integrated REST APIs to process 1000+ gameplay hours using Python on robust backend pipelines, leveraging Pandas to produce classification models on athletes' playstyles.",
        'Designed 16+ metrics using data science frameworks (scikit-learn, XGBoost) for insights on player capabilities, improving performances by 40% over three months.',
      ],
    },
  ],
  education: [
    {
      degree: 'Aerospace Engineering (B.S.)',
      school: 'University of Illinois Urbana-Champaign',
      bullets: [
        'Designed and implemented autonomous collision avoidance systems for drones in C.',
        'Manufactured and tested carbon fiber paneling created with prepreg lamination techniques.',
        'Proceed, analyzed and managed big data for weather patterns via Pandas and Dask.',
      ],
    },
  ],
  skills: [
    {
      label: 'Programming',
      items: ['Python', 'C', 'C++', 'Rust', 'TypeScript', 'JavaScript', 'Astro', 'Git', 'Docker', 'AWS', 'CI/CD'],
    },
    {
      label: 'Mechanical Design & Testing',
      items: ['SolidWorks', 'CATIA', 'AutoCAD', 'MATLAB', 'GD&T', 'FEA', 'NDT'],
    },
    {
      label: 'Languages',
      items: ['English', 'Portuguese', 'Spanish', 'French'],
    },
    {
      label: 'Soft Skills',
      items: ['Communication', 'Analytical Problem Solving', 'Cross-Functional Teamwork'],
    },
  ],
};
