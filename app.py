import streamlit as st
import math

# ---- THEME: Seoul-Inspired Minimalist ----
# Streamlit's theme can be set in config.toml, but we can set some custom CSS here.
custom_css = """
<style>
/* Hide default Streamlit navbar and footer */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}

/* General background and font */
body, .css-18e3th9 {
    background-color: #f8f6f1 !important; /* beige */
    font-family: 'Segoe UI', 'Noto Sans', Arial, sans-serif;
}
/* Card / box backgrounds */
.stApp {
    background-color: #f8f6f1;
}

/* Widgets */
div[data-testid="stSidebar"], .st-af {
    background-color: #ede6dd;
}

.stButton>button {
    background-color: #24344d !important; /* navy */
    color: #fffafa !important; /* white */
    border-radius: 0.5em;
    border: none;
    padding: 0.3em 1.2em;
    font-weight: 600;
}

input, .stNumberInput input {
    background: #fffafa !important;
    border-radius: 6px !important;
    border: 1px solid #bbb5ab !important;
}

hr {border-color: #d4ccb9;}
/* Metrics text colors */
.metric-label, .stMetricLabel, .stMetricValue {
    color: #4d3a22 !important; /* brown */
}
/* Chart axes, ticks, titles */
g.tick text, .title {
    fill: #24344d !important; /* navy */
}
</style>
"""

st.markdown(custom_css, unsafe_allow_html=True)

# ---- BASELINE METRICS ----
BASELINE = {
    'chain_slack_mm_low': 20,
    'chain_slack_mm_high': 25,
    'rear_tire_psi_std': 32,
    'front_tire_psi_std': 29,
}

# ---- SIDEBAR INPUT FORM ----
with st.sidebar:
    st.title('📊 Ride Input')
    odo = st.number_input(
        'Current Odometer Reading (km)',
        min_value=0,
        max_value=300000,
        step=1,
        value=20000,
        help="Your bike's current total km"
    )
    trip_km = st.number_input(
        'Trip Distance (km)',
        min_value=1,
        max_value=2000,
        step=1,
        value=80,
        help="How far you rode on this trip"
    )
    tire_front = st.number_input(
        'Front Tire Pressure (PSI)',
        min_value=15,
        max_value=50,
        step=1,
        value=BASELINE['front_tire_psi_std'],
        help="Check with a reliable pressure gauge"
    )
    tire_rear = st.number_input(
        'Rear Tire Pressure (PSI)',
        min_value=15,
        max_value=50,
        step=1,
        value=BASELINE['rear_tire_psi_std'],
        help="Check with a reliable pressure gauge"
    )
    chain_slack = st.number_input(
        'Chain Slack (mm)',
        min_value=0,
        max_value=50,
        step=1,
        value=22,
        help="Measured at tightest point; Between 20-25mm is healthy"
    )

    st.markdown("---")
    st.caption("All inputs are heuristic and for guidance only. Always check with your manual.")

# ---- LOGIC ENGINE (HEURISTIC RULES) ----

# Chain health
if chain_slack < BASELINE["chain_slack_mm_low"]:
    chain_status = "Too Tight"
    chain_score = 0.50
    chain_message = "⚠️ Chain may be over-tightened — check slack and adjust."
    chain_warning = True
elif chain_slack > BASELINE["chain_slack_mm_high"]:
    chain_status = "Tension Required Soon"
    chain_score = 0.60 - min((chain_slack-BASELINE["chain_slack_mm_high"])/50, 0.15)
    chain_message = "🔧 Chain slack is high — adjustment required soon."
    chain_warning = True
else:
    chain_status = "Good"
    chain_score = 1.0
    chain_message = "Chain is within healthy range."
    chain_warning = False

# Simple heuristic: estimate at what km chain will require adjustment again
CHAIN_SLACK_MAX = 30 # mm
CHAIN_ADJ_THRESHOLD_MM = BASELINE['chain_slack_mm_high']

# Tweak this math for chain wear rate per trip (heuristic)
if chain_slack >= CHAIN_ADJ_THRESHOLD_MM:
    km_till_required_adj = max(int(trip_km * ((CHAIN_SLACK_MAX - chain_slack)/(chain_slack-CHAIN_ADJ_THRESHOLD_MM+1)+1)), 100)
else:
    km_till_required_adj = int((CHAIN_SLACK_MAX - chain_slack) * 40)  # 40km per mm over base

# Tire health
tire_diff_front = abs(tire_front - BASELINE["front_tire_psi_std"])
tire_diff_rear = abs(tire_rear - BASELINE["rear_tire_psi_std"])

if tire_diff_front > 3:
    tire_front_status = "Check Pressure"
    tire_front_score = 0.6
else:
    tire_front_status = "Good"
    tire_front_score = 1.0

if tire_diff_rear > 3:
    tire_rear_status = "Check Pressure"
    tire_rear_score = 0.6
else:
    tire_rear_status = "Good"
    tire_rear_score = 1.0

# Wear prediction (very basic, can be tuned)
# Assume tires last 15000km, chain lasts 18000km (Dominar 250 typicals)
tire_life_km = 15000
chain_life_km = 18000

tire_front_life_left_km = max(tire_life_km - odo % tire_life_km, 0)
tire_rear_life_left_km = max(tire_life_km - odo % tire_life_km, 0)
chain_life_left_km = max(chain_life_km - odo % chain_life_km, 0)

# Health Score - weighted across important systems
scores = [
    chain_score * 0.4,
    0.3 * tire_front_score,
    0.3 * tire_rear_score
]
bike_health_score = round(100 * sum(scores), 1)

# ---- DASHBOARD DISPLAY ----
st.title('🏍️ Predictive Telemetry & Maintenance Analyzer')
st.markdown(
    "<h4 style='color:#24344d; font-weight:700;'>Bajaj Dominar 250 Baseline</h4>",
    unsafe_allow_html=True
)
st.markdown(
    f"<div style='background:#ede6dd; padding:1em 1.5em; border-radius:14px; color:#4d3a22;'>"
    f"Chain Slack (mm): <b>20-25</b>, Rear Tire: <b>32 PSI</b>, Front Tire: <b>29 PSI</b>.<br>"
    f"Chain/tyre lifespans: ~18,000km / 15,000km (est.)</div>",
    unsafe_allow_html=True
)
st.write("")

score_bar_color = "#24344d" if bike_health_score > 80 else ("#846047" if bike_health_score > 60 else "#ccba9c")

# Main Bike Health Meter
st.markdown(
    f"""
    <div style="background:#fffafa;border-radius:20px;box-shadow:0 1px 10px #ede6dd77;padding:2em 2em; margin-bottom:1.5em;">
        <div style="font-weight:500; color:#4d3a22; font-size:1.2em;">Estimated Bike Health Score</div>
        <div style="font-size:2.5em;font-weight:bold;color:{score_bar_color};line-height:1;">
            {bike_health_score}/100
        </div>
        <div style="width:100%; background:#ede6dd; height:16px; border-radius:8px; margin-top:5px; margin-bottom:0.5em;">
            <div style="width:{bike_health_score}%; background:{score_bar_color}; height:16px; border-radius:8px;"></div>
        </div>
    </div>
    """, unsafe_allow_html=True
)

# System metrics
col1, col2, col3 = st.columns(3)
with col1:
    st.metric(
        label="Chain Slack (mm)",
        value=int(chain_slack),
        delta=chain_status if not chain_warning else f"⚠️ {chain_status}",
        help=chain_message
    )
with col2:
    st.metric(
        label="Front Tire PSI",
        value=int(tire_front),
        delta=tire_front_status,
        help=f"Standard: {BASELINE['front_tire_psi_std']} PSI"
    )
with col3:
    st.metric(
        label="Rear Tire PSI",
        value=int(tire_rear),
        delta=tire_rear_status,
        help=f"Standard: {BASELINE['rear_tire_psi_std']} PSI"
    )

st.markdown("----")

# ---- Predictions/Warnings ----
st.subheader("Maintenance Predictions 📈")
st.markdown(
    f"""
    <ul style='color:#4d3a22;font-size:1.08em;'>
      <li><b>Next Chain Adjustment:</b> <span style='color:#24344d;'>{km_till_required_adj:,} km</span>
          {'<span style="color:#846047;">(' + chain_message + ')</span>' if chain_warning else ''}</li>
      <li><b>Estimated Chain Life Remaining:</b> {chain_life_left_km:,} km</li>
      <li><b>Estimated Tire Life Remaining (front):</b> {tire_front_life_left_km:,} km</li>
      <li><b>Estimated Tire Life Remaining (rear):</b> {tire_rear_life_left_km:,} km</li>
    </ul>
    """,
    unsafe_allow_html=True
)

st.markdown("----")

# ---- Conditioned visually-muted chart (NO GREENS!) ----
import altair as alt
import pandas as pd

ride_factors = pd.DataFrame({
    "Component": ["Chain", "Front Tire", "Rear Tire"],
    "Score": [chain_score*100, tire_front_score*100, tire_rear_score*100],
    "Color": ["#24344d", "#b0a37b", "#846047"] # Navy, beige, brown
})
bar_chart = alt.Chart(ride_factors).mark_bar(size=60, cornerRadiusTop=7).encode(
    x=alt.X('Component', axis=alt.Axis(title=None, labelColor="#4d3a22", labelFont="Segoe UI")),
    y=alt.Y('Score', axis=alt.Axis(title="Health (out of 100)", titleColor="#24344d")),
    color=alt.Color('Color:N', scale=None, legend=None),
    tooltip=[alt.Tooltip('Component'), alt.Tooltip('Score', format=".1f")]
).properties(height=260)
st.altair_chart(bar_chart, use_container_width=True)

# ---- Bottom notice ----
st.markdown(
    "<div style='color:#b0a37b;padding-top:1.2em; font-size:0.9em;'>"
    "These are predictive heuristics. For accurate maintenance intervals, always check your motorcycle's official manual and inspect in person. "
    "No color in this app is green, in compliance with dashboard design policy.<br>"
    "<i>Designed for Bajaj Dominar 250 riders. Seoul-inspired, earth palette overview.</i></div>",
    unsafe_allow_html=True
)

# ==============
# You can tweak heuristic math:
#
# - For chain wear prediction: see the `km_till_required_adj` math in the logic block.
# - For "health score" weights: see the `scores` array and the multipliers.
# - For lifetime values: adjust `tire_life_km` and `chain_life_km`.
# - For healthy ranges, adjust the BASELINE dictionary at the top.
# ==============