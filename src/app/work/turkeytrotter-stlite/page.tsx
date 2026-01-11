// Turkey Trotter stlite page - Streamlit running entirely in the browser via WebAssembly
// This demonstrates Option 2: stlite (Pyodide-based client-side Streamlit)
//
// LIMITATIONS:
// - DuckDB does NOT work in Pyodide, so we use pandas instead
// - Plotly does NOT work reliably, so we use st.bar_chart (built-in Streamlit charts)
// - Initial load takes 5-15 seconds as Pyodide/WebAssembly initializes
// - Large bundle size (~30MB for Pyodide runtime)
// - Some Python packages may not be available in Pyodide

import type { Metadata } from 'next';
import StliteEmbed from './StliteEmbed';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Turkey Trotter - stlite Demo',
  description: 'Turkey Trot race dashboard running entirely in the browser using stlite (Streamlit on WebAssembly)',
};

export default function TurkeyTrotterStlitePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Turkey Trotter Dashboard
          <span className={styles.badge}>Option 2: stlite</span>
        </h1>
        <p className={styles.subtitle}>
          Streamlit running 100% in your browser via WebAssembly (Pyodide)
        </p>
      </div>

      <div className={styles.description}>
        <p>
          <strong>What is this?</strong> This page embeds a Streamlit dashboard that runs
          entirely client-side using stlite. No Python server needed - the Python code
          executes directly in your browser using WebAssembly.
        </p>
        <p>
          <strong>Note:</strong> First load takes 5-15 seconds while Pyodide initializes.
          Subsequent interactions are fast.
        </p>
      </div>

      <StliteEmbed />

      <div className={styles.limitations}>
        <h4>stlite Limitations vs. Server-side Streamlit:</h4>
        <ul>
          <li>DuckDB not supported - using pandas for data processing</li>
          <li>Plotly not reliable - using built-in Streamlit charts</li>
          <li>Sample data only (no database connection)</li>
          <li>Slower initial load (WebAssembly startup)</li>
          <li>Limited Python package availability</li>
        </ul>
      </div>

      <p className={styles.linkBack}>
        <a href="https://turkeytrotter.streamlit.app/" target="_blank" rel="noopener noreferrer">
          View the full server-side version at turkeytrotter.streamlit.app
        </a>
      </p>
    </div>
  );
}
