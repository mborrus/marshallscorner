'use client';

// StliteEmbed - Client component that mounts stlite (Streamlit on WebAssembly)
// Must be a client component because:
// 1. stlite manipulates the DOM directly
// 2. We need useEffect to run after hydration
// 3. We dynamically load the stlite script to avoid SSR issues
//
// Using @stlite/browser (formerly @stlite/mountable since v0.76.0)
// Loaded via CDN to avoid bundling issues with WebAssembly

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

// Loading steps for user feedback
type LoadingStep = 'script' | 'pyodide' | 'packages' | 'app' | 'done';

const LOADING_STEPS: { key: LoadingStep; label: string }[] = [
  { key: 'script', label: 'Loading stlite runtime...' },
  { key: 'pyodide', label: 'Initializing Pyodide (WebAssembly Python)...' },
  { key: 'packages', label: 'Installing Python packages...' },
  { key: 'app', label: 'Starting Streamlit app...' },
  { key: 'done', label: 'Ready!' },
];

// Sample Turkey Trot race data embedded directly in the Python code
// This replaces the DuckDB database queries from the original app
const STREAMLIT_CODE = `
import streamlit as st
import pandas as pd
import io

# Page config
st.set_page_config(
    page_title="Turkey Trotter",
    page_icon="🦃",
    layout="wide"
)

# Sample Turkey Trot race data (replacing DuckDB queries)
# Real app would fetch from database; stlite can't use DuckDB
SAMPLE_DATA = """
name,year,age,gender,pace_seconds,finish_time,place_overall,place_gender
Alice Johnson,2023,32,F,480,1440,15,3
Bob Smith,2023,45,M,420,1260,5,4
Carol Davis,2023,28,F,510,1530,25,8
David Brown,2023,38,M,390,1170,2,2
Emma Wilson,2023,55,F,540,1620,42,15
Frank Miller,2023,29,M,405,1215,3,3
Grace Lee,2023,41,F,495,1485,20,6
Henry Chen,2023,33,M,435,1305,8,6
Ivy Taylor,2023,26,F,465,1395,12,2
Jack White,2023,50,M,450,1350,10,8
Alice Johnson,2022,31,F,490,1470,18,4
Bob Smith,2022,44,M,425,1275,6,5
Carol Davis,2022,27,F,520,1560,28,10
David Brown,2022,37,M,385,1155,1,1
Frank Miller,2022,28,M,410,1230,4,4
Grace Lee,2022,40,F,500,1500,22,7
Henry Chen,2022,32,M,440,1320,9,7
Ivy Taylor,2022,25,F,470,1410,14,3
Jack White,2022,49,M,455,1365,11,9
Kate Moore,2022,35,F,485,1455,16,5
David Brown,2021,36,M,395,1185,2,2
Bob Smith,2021,43,M,430,1290,7,6
Alice Johnson,2021,30,F,495,1485,20,5
Frank Miller,2021,27,M,415,1245,5,5
Grace Lee,2021,39,F,505,1515,24,8
Henry Chen,2021,31,M,445,1335,10,8
Ivy Taylor,2021,24,F,475,1425,15,4
Mike Adams,2021,42,M,400,1200,3,3
Nancy Clark,2021,48,F,530,1590,35,12
Oscar Brown,2021,22,M,380,1140,1,1
"""

@st.cache_data
def load_data():
    """Load sample race data from embedded CSV string."""
    df = pd.read_csv(io.StringIO(SAMPLE_DATA.strip()))
    return df

def format_pace(seconds):
    """Format pace in seconds to MM:SS per mile."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"

def format_time(seconds):
    """Format finish time in seconds to MM:SS."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"

# Load data
df = load_data()

# Title
st.title("🦃 Turkey Trotter Dashboard")
st.markdown("*Sample data demo running in stlite (browser-only)*")

# Create tabs for different features
tab1, tab2, tab3 = st.tabs(["📊 Pace Distribution", "🔍 Runner Lookup", "📈 Stats"])

with tab1:
    st.header("Pace Distribution")

    # Year selector
    years = sorted(df['year'].unique(), reverse=True)
    selected_year = st.selectbox("Select Year", years, key="pace_year")

    year_data = df[df['year'] == selected_year]

    # Create pace bins for histogram
    year_data = year_data.copy()
    year_data['pace_min'] = year_data['pace_seconds'] / 60

    # Simple histogram using st.bar_chart (works in stlite, unlike plotly)
    st.subheader(f"Pace Distribution - {selected_year}")

    # Bin the paces
    bins = [5, 6, 7, 8, 9, 10, 11, 12]
    labels = ['5-6', '6-7', '7-8', '8-9', '9-10', '10-11', '11-12']
    year_data['pace_bin'] = pd.cut(year_data['pace_min'], bins=bins, labels=labels)

    pace_counts = year_data['pace_bin'].value_counts().sort_index()
    st.bar_chart(pace_counts)

    st.caption("Pace shown in minutes per mile")

    # Summary stats
    col1, col2, col3 = st.columns(3)
    with col1:
        avg_pace = year_data['pace_seconds'].mean()
        st.metric("Average Pace", format_pace(avg_pace))
    with col2:
        fastest = year_data['pace_seconds'].min()
        st.metric("Fastest Pace", format_pace(fastest))
    with col3:
        st.metric("Total Runners", len(year_data))

with tab2:
    st.header("Runner Lookup")

    # Get unique runner names
    runners = sorted(df['name'].unique())

    selected_runner = st.selectbox("Search for a runner", runners, key="runner_search")

    if selected_runner:
        runner_data = df[df['name'] == selected_runner].sort_values('year', ascending=False)

        if len(runner_data) > 0:
            st.subheader(f"Results for {selected_runner}")

            # Show race history
            for _, row in runner_data.iterrows():
                with st.container():
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.write(f"**{row['year']}**")
                    with col2:
                        st.write(f"Pace: {format_pace(row['pace_seconds'])}")
                    with col3:
                        st.write(f"Time: {format_time(row['finish_time'])}")
                    with col4:
                        st.write(f"Place: {row['place_overall']}")

            # Show trend if multiple years
            if len(runner_data) > 1:
                st.subheader("Performance Over Time")
                trend_data = runner_data.set_index('year')['pace_seconds'].sort_index()
                # Convert to minutes for display
                trend_data = trend_data / 60
                st.line_chart(trend_data)
                st.caption("Pace in minutes per mile (lower is faster)")

with tab3:
    st.header("Race Statistics")

    # Year selector
    stat_year = st.selectbox("Select Year", years, key="stat_year")
    stat_data = df[df['year'] == stat_year]

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Gender Breakdown")
        gender_counts = stat_data['gender'].value_counts()
        st.bar_chart(gender_counts)

        # Gender stats
        for gender in ['M', 'F']:
            g_data = stat_data[stat_data['gender'] == gender]
            if len(g_data) > 0:
                avg = g_data['pace_seconds'].mean()
                st.write(f"**{gender}:** {len(g_data)} runners, avg pace {format_pace(avg)}")

    with col2:
        st.subheader("Age Distribution")
        # Bin ages
        stat_data = stat_data.copy()
        age_bins = [0, 30, 40, 50, 60, 100]
        age_labels = ['Under 30', '30-39', '40-49', '50-59', '60+']
        stat_data['age_group'] = pd.cut(stat_data['age'], bins=age_bins, labels=age_labels)
        age_counts = stat_data['age_group'].value_counts().sort_index()
        st.bar_chart(age_counts)

    # Top finishers
    st.subheader(f"Top 5 Finishers - {stat_year}")
    top5 = stat_data.nsmallest(5, 'place_overall')[['name', 'pace_seconds', 'finish_time', 'place_overall']]
    top5['Pace'] = top5['pace_seconds'].apply(format_pace)
    top5['Time'] = top5['finish_time'].apply(format_time)
    top5 = top5[['name', 'Pace', 'Time', 'place_overall']]
    top5.columns = ['Name', 'Pace', 'Finish Time', 'Place']
    st.dataframe(top5, hide_index=True)

# Footer
st.markdown("---")
st.caption("🦃 Turkey Trotter - Running in stlite (Streamlit on WebAssembly)")
st.caption("This is a simplified demo. The full version at turkeytrotter.streamlit.app has more features.")
`;

export default function StliteEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<LoadingStep>('script');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Prevent double-mounting in React StrictMode
    if (mountedRef.current) return;
    mountedRef.current = true;

    async function initStlite() {
      try {
        // Step 1: Load stlite CSS
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://cdn.jsdelivr.net/npm/@stlite/browser@0.85.1/build/stlite.css';
        document.head.appendChild(linkEl);

        // Step 2: Load stlite script via script tag (more reliable than dynamic import for CDN)
        setCurrentStep('pyodide');

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@stlite/browser@0.85.1/build/stlite.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load stlite script'));
          document.head.appendChild(script);
        });

        // Access stlite from window (it's added as a global)
        const stlite = (window as unknown as { stlite: { mount: (config: unknown, el: HTMLElement) => unknown } }).stlite;

        if (!stlite) {
          throw new Error('stlite not found on window');
        }

        if (!containerRef.current) {
          throw new Error('Container element not found');
        }

        setCurrentStep('packages');

        // Step 3: Mount the Streamlit app
        // The mount function handles Pyodide initialization and package installation
        stlite.mount(
          {
            entrypoint: 'app.py',
            files: {
              'app.py': STREAMLIT_CODE,
            },
            requirements: ['pandas'],
            streamlitConfig: {
              'theme.base': 'light',
              'client.toolbarMode': 'minimal',
            },
          },
          containerRef.current
        );

        setCurrentStep('app');

        // Note: stlite doesn't provide a clean "ready" callback,
        // so we estimate based on typical load times
        // The actual UI will appear when ready
        setTimeout(() => {
          setCurrentStep('done');
        }, 3000);

      } catch (err) {
        console.error('Failed to initialize stlite:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stlite');
      }
    }

    initStlite();

    // Cleanup function
    return () => {
      // Note: stlite doesn't provide a clean unmount API
      // The component will be removed when the page unmounts
    };
  }, []);

  // Show error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h3 className={styles.errorTitle}>Failed to Load</h3>
        <p className={styles.errorText}>{error}</p>
        <p className={styles.errorText}>
          Try refreshing the page or check the browser console for details.
        </p>
      </div>
    );
  }

  // Show loading state while stlite initializes
  const showLoading = currentStep !== 'done';

  return (
    <div className={styles.stliteWrapper}>
      {showLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <h3 className={styles.loadingTitle}>Loading Turkey Trotter Dashboard</h3>
          <p className={styles.loadingText}>
            {LOADING_STEPS.find(s => s.key === currentStep)?.label}
          </p>
          <ul className={styles.loadingSteps}>
            {LOADING_STEPS.map((step) => {
              const stepIndex = LOADING_STEPS.findIndex(s => s.key === step.key);
              const currentIndex = LOADING_STEPS.findIndex(s => s.key === currentStep);
              const isDone = stepIndex < currentIndex;
              const isActive = step.key === currentStep;

              return (
                <li
                  key={step.key}
                  className={isDone ? styles.done : isActive ? styles.active : ''}
                >
                  {step.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div
        ref={containerRef}
        className={styles.stliteContainer}
        style={{ display: showLoading ? 'none' : 'block' }}
      />
    </div>
  );
}
