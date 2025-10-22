'use client';

import Link from 'next/link';

const HERO_BADGE = {
  emoji: '🤝',
  text: 'The Teacher for you',
};

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Start with a safe space check-in',
    description:
      'Facilitators or caregivers choose the language, tone, and goals that match the learners gathered today.',
  },
  {
    step: '02',
    title: 'Launch flexible lesson packs',
    description:
      'Pick short, story-driven modules that can pause anytime. Offline caching keeps progress ready for the next meetup.',
  },
  {
    step: '03',
    title: 'Blend digital and tactile practice',
    description:
      'Use device-friendly prompts plus printable mini-missions so learners can continue even without a screen.',
  },
  {
    step: '04',
    title: 'Celebrate progress and hand off',
    description:
      'Capture highlights locally and sync when connected. Share simple summaries with families or partner NGOs.',
  },
];

const UNIQUE_POINTS = [
  {
    title: 'Offline-first storytelling',
    description:
      'Narratives and games designed for limited connectivity and shared devices common in community hubs.',
    status: 'Live',
  },
  {
    title: 'Local context builder',
    description:
      'Create lessons with familiar places, guardians, and daily tasks to make learning feel immediately relevant.',
    status: 'Live',
  },
  {
    title: 'Facilitator co-pilot',
    description:
      'Quick scripts and prompts help mentors support mixed-age groups with confidence.',
    status: 'In pilot',
  },
  {
    title: 'Resilience tracking',
    description:
      'Capture attendance, encouragement, and wellbeing notes to coordinate with social workers.',
    status: 'Prototype',
  },
  {
    title: 'Low-literacy guardian briefings',
    description:
      'Audio and visual summaries make it easy to loop in caregivers who prefer WhatsApp or printouts.',
    status: 'In development',
  },
];

const SUPPORT_PATHS = [
  {
    title: 'Drop-in community hubs',
    summary:
      'Design short sessions for learners juggling work, caregiving, or transit schedules. Works with limited supervision.',
    href: 'mailto:hello@graspy.org?subject=graspy%20community%20hubs',
  },
  {
    title: 'Transit and shelter programs',
    summary:
      'Offer calming, structured activities between moves. Offline kits keep continuity even when devices rotate.',
    href: 'mailto:hello@graspy.org?subject=graspy%20transit%20and%20shelter%20programs',
  },
  {
    title: 'Street-to-school bridges',
    summary:
      'Blend foundational academics with social stories that prepare young people for re-entry into classrooms.',
    href: 'mailto:hello@graspy.org?subject=graspy%20street%20to%20school%20bridges',
  },
  {
    title: 'NGO facilitator networks',
    summary:
      'Coordinate consistent lesson packs across cities. Dashboards and print packs keep mentors aligned in the field.',
    href: 'mailto:hello@graspy.org?subject=graspy%20ngo%20facilitator%20networks',
  },
];

const BETA_STATUS = {
  live: [
    'Offline-friendly story lessons in 3 languages',
    'Facilitator notes for groups with mixed ages',
    'Printable extension activities for no-device days',
  ],
  pilot: [
    'WhatsApp guardian check-ins in local dialects',
    'Attendance snapshots for community partners',
    'Wellbeing prompts co-designed with youth mentors',
  ],
  next: [
    'Low-bandwidth voice prompts and narration',
    'Partner dashboards for case management teams',
    'Mesh sync to share progress without internet',
  ],
};

export default function CommunityLandingPage() {
  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <div className="h-64 w-[50rem] rounded-full bg-sky-200/60 blur-3xl" aria-hidden />
      </div>

      <header className="sticky top-0 z-10 border-b border-sky-100 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-lg font-semibold tracking-tight text-sky-600">
            graspy
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
            >
              Explore the demo
            </Link>
            <Link
              href="mailto:hello@graspy.org"
              className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Partner with us
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-0">
        <section className="relative border-b border-sky-100 bg-gradient-to-b from-sky-50 via-white to-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-28 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
            <div className="max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sky-600">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-white">
                  {HERO_BADGE.emoji}
                </span>
                {HERO_BADGE.text}
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Education that reaches you, wherever you are
              </h1>
              <p className="text-lg text-slate-600 sm:text-xl">
                Personal, playful lessons in the child's language. Built for communities of out-of-school learners.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Explore the demo
                </Link>
                <Link
                  href="mailto:hello@graspy.org?subject=Community%20edition%20interest"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Talk with our team
                </Link>
              </div>
            </div>

            <div className="relative isolate -mx-4 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 px-8 py-10 shadow-2xl sm:mx-0 sm:px-10 lg:px-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_60%)]" aria-hidden />
              <div className="space-y-5 text-white">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  What learners feel
                </p>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between text-sm text-white/90">
                    <span>Today&apos;s circle</span>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Stories • Ages 10-14</span>
                  </div>
                  <h2 className="text-2xl font-semibold">Finding calm through market day stories 🛒</h2>
                  <p className="mt-3 text-sm text-white/90">
                    Welcome back, team. We&apos;ll use trading tales from the neighborhood market to practice reading, counting, and sharing.
                  </p>
                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="rounded-xl border border-white/20 bg-white/5 p-3">
                      <p className="font-medium">Gather</p>
                      <p className="text-white/80">Quick wellness check and breathing exercise before we dive in.</p>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-white/5 p-3">
                      <p className="font-medium">Explore</p>
                      <p className="text-white/80">Audio-backed story that works offline with picture cues for emerging readers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-sky-100 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              How it fits your program
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              Simple flows that respect rotating attendance, limited devices, and the need for care-first learning.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {HOW_IT_WORKS_STEPS.map(step => (
                <div
                  key={step.step}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                >
                  <span className="inline-flex w-fit items-center rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-sky-100 bg-sky-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              What makes graspy work off the beaten path.
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              Built with young people learning beyond the classroom so every interaction feels human and hopeful.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {UNIQUE_POINTS.map(point => (
                <div
                  key={point.title}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-6 shadow-sm transition hover:border-sky-200 hover:bg-white"
                >
                  <span className="inline-flex w-fit items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                    {point.status}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{point.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-sky-100 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Support paths we serve with you.
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              Reach out to co-design the version that keeps your young learners coming back tomorrow.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {SUPPORT_PATHS.map(context => (
                <div
                  key={context.title}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                >
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{context.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{context.summary}</p>
                  </div>
                  <div className="mt-auto">
                    <Link
                      href={context.href}
                      className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
                    >
                      Contact for this path
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 py-16 text-white">
          <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">
                Beta status
              </p>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Transparent on where we are together.
              </h2>
              <p className="text-base text-sky-100">
                Share feedback from the field. We reinvest every insight into tools that meet learners on their terms.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white">Live today</h3>
                <ul className="mt-4 space-y-3 text-sm text-sky-100">
                  {BETA_STATUS.live.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 text-sky-200">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white">In pilot</h3>
                <ul className="mt-4 space-y-3 text-sm text-sky-100">
                  {BETA_STATUS.pilot.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 text-sky-200">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-white">Coming next</h3>
                <ul className="mt-4 space-y-3 text-sm text-sky-100">
                  {BETA_STATUS.next.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 text-sky-200">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-sm text-sky-200">
              Timelines adapt with partners on the ground. We share release notes with every cohort.
            </p>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-sky-700 bg-sky-900 py-14 text-sky-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Let&apos;s build what out-of-school learners deserve.
          </h2>
          <p className="text-base text-sky-100">
            Demo the latest release or co-design with us. Every message helps us serve your community better.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore the demo
            </Link>
            <Link
              href="mailto:hello@graspy.org?subject=Community%20edition%20partnership"
              className="inline-flex items-center justify-center rounded-full border border-sky-200 px-6 py-3 text-base font-semibold text-sky-50 transition hover:bg-sky-800"
            >
              Partner with us
            </Link>
          </div>
          <p className="text-xs text-sky-200">
            We co-create with frontline teams - share what your learners need next.
          </p>
        </div>
      </footer>
    </div>
  );
}
