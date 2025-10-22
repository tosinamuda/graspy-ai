'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function TestLatexPage() {
  const testCases = [
    {
      title: 'Inline Math - Parentheses Delimiters',
      content: 'Consider a right triangle with \\(\\theta\\), opposite side of 3 units, adjacent side of 4 units, and hypotenuse of 5 units.',
    },
    {
      title: 'Inline Math - Dollar Sign Delimiters',
      content: 'The formula for the area of a circle is $A = \\pi r^2$ where $r$ is the radius.',
    },
    {
      title: 'Display Math - Double Dollar Signs',
      content: 'The quadratic formula is:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$',
    },
    {
      title: 'Trigonometric Ratios',
      content: `Calculate the trigonometric ratios:

- \\(\\sin(\\theta) = \\frac{\\text{opposite}}{\\text{hypotenuse}} = \\frac{3}{5} = 0.6\\)
- \\(\\cos(\\theta) = \\frac{\\text{adjacent}}{\\text{hypotenuse}} = \\frac{4}{5} = 0.8\\)
- \\(\\tan(\\theta) = \\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{3}{4} = 0.75\\)`,
    },
    {
      title: 'Mixed Content with Math',
      content: `Let's work through an example to calculate the trigonometric ratios. Consider a right triangle with an angle (\\(\\theta\\)), opposite side of 3 units, adjacent side of 4 units, and hypotenuse of 5 units.

**Step 1:** Calculate sine
$$\\sin(\\theta) = \\frac{\\text{opposite}}{\\text{hypotenuse}} = \\frac{3}{5} = 0.6$$

**Step 2:** Calculate cosine
$$\\cos(\\theta) = \\frac{\\text{adjacent}}{\\text{hypotenuse}} = \\frac{4}{5} = 0.8$$

**Step 3:** Calculate tangent
$$\\tan(\\theta) = \\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{3}{4} = 0.75$$

These calculations show how to find the trigonometric ratios for a given angle in a right triangle.`,
    },
    {
      title: 'Complex Math Expression',
      content: 'The derivative of \\(f(x) = x^2 + 2x + 1\\) is \\(f\'(x) = 2x + 2\\).',
    },
    {
      title: 'Fractions and Square Roots',
      content: 'The distance formula is \\(d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}\\)',
    },
    {
      title: 'Subscripts and Superscripts',
      content: 'Consider the sequence \\(a_n = a_1 + (n-1)d\\) where \\(a_1\\) is the first term and \\(d\\) is the common difference.',
    },
    {
      title: 'Greek Letters',
      content: 'Common angles include \\(\\alpha\\), \\(\\beta\\), \\(\\gamma\\), and \\(\\theta\\).',
    },
    {
      title: 'Display Math with Alignment',
      content: `Solving the equation step by step:

$$
\\begin{align}
2x + 3 &= 7 \\\\
2x &= 4 \\\\
x &= 2
\\end{align}
$$`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LaTeX Rendering Test</h1>
          <p className="mt-2 text-gray-600">
            This page tests various LaTeX math expressions to ensure proper rendering.
          </p>
        </header>

        <div className="space-y-6">
          {testCases.map((testCase, index) => (
            <section
              key={index}
              className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-lg font-semibold text-indigo-600">
                Test {index + 1}: {testCase.title}
              </h2>
              <div className="prose prose-indigo max-w-none text-base leading-relaxed text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => <p className="leading-relaxed mb-4">{children}</p>,
                    li: ({ children }) => <li className="ml-4 list-disc leading-relaxed">{children}</li>,
                    ul: ({ children }) => <ul className="space-y-2 mb-4">{children}</ul>,
                    ol: ({ children }) => <ol className="space-y-2 list-decimal ml-6 mb-4">{children}</ol>,
                    code: ({ children, className }) => {
                      if (className?.includes('language-math')) {
                        return <code>{children}</code>;
                      }
                      return (
                        <code className="rounded bg-indigo-50 px-1.5 py-0.5 text-sm font-mono text-indigo-900">
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm mb-4">
                        {children}
                      </pre>
                    ),
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  }}
                >
                  {testCase.content}
                </ReactMarkdown>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View raw markdown
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-100 p-4 text-xs text-gray-700">
                  {testCase.content}
                </pre>
              </details>
            </section>
          ))}
        </div>

        <footer className="mt-8 rounded-lg bg-indigo-50 p-4 text-sm">
          <h3 className="font-semibold text-indigo-900">LaTeX Syntax Guide:</h3>
          <ul className="mt-2 space-y-1 text-indigo-700">
            <li>• Inline math: <code className="bg-white px-1">\\(formula\\)</code> or <code className="bg-white px-1">$formula$</code></li>
            <li>• Display math: <code className="bg-white px-1">$$formula$$</code></li>
            <li>• Fractions: <code className="bg-white px-1">\\frac{'{numerator}'}{'{denominator}'}</code></li>
            <li>• Square roots: <code className="bg-white px-1">\\sqrt{'{expression}'}</code></li>
            <li>• Subscripts: <code className="bg-white px-1">x_n</code></li>
            <li>• Superscripts: <code className="bg-white px-1">x^2</code></li>
            <li>• Greek letters: <code className="bg-white px-1">\\alpha, \\beta, \\theta</code></li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
