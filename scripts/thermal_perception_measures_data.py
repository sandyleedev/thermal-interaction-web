"""Thermal perception measurement notes keyed by paper id (1–50)."""

THERMAL_PERCEPTION_MEASURES: dict[str, str] = {
    "1": """Study 1 and 2: participants report if they feel a "single continuous moving stroke". Specifically:
Study 1: Binary motion detection --- Section 4.3 (page 5-6):
Measure: Probability of perceiving thermal motion (binary yes/no).
Analysis: RM-ANOVA on perception probability.

Study 2: Psychophysical thresholds --- Section 5.2 (page 7):
Measures: Lower threshold (minimum duration for perception), Upper threshold (maximum duration for perception), Speed range (cm/s) derived from duration thresholds.

Study 3: Qualitative interviews --- Section 6.2 (page 9):
Semi-structured interview lasting approximately 12 minutes, collected qualitative feedback on: Immersion, Clarity of motion, Realism, Enjoyment, Comfort.""",
    "2": """Interview and description with tools (body map and sensual evaluation instrument) (page 5).""",
    "3": """Questionnaire. 5-point (-2 to 2). Measured "strength" and "duration" of cold sensation.
They tasted ice cream under two conditions and rated which felt colder, using comparative judgments rather than absolute ratings.""",
    "4": """Three-question method with binary responses (yes/no) to determine referral state. See p6.
Q1: "I felt the thermal sensations" (yes/no) - validates thermal detection
Q2: "Please select the region where you felt strong (hot/warm) sensations" (thermal location vs tactile location)
Q3: "Did you also feel (hot/warm) sensations in the other region?" (yes/no)""",
    "5": """Study 1 (page 5):
4-point Likert scale: 0 (not at all) to 3 (significant) for warmth intensity
Body drawings: Participants drew perceived thermal areas on tablet with stylus
Thermal detection rate: Yes/no whether thermal sensation was felt (Q1)

Study 2 (page 7):
Visual Analogue Scale (VAS): Continuous slider from "Not at all" to "Very much" for warmth
Reaction time: Time to press spacebar when feeling warmth
Skin temperature measurements via thermistors

Study 3 (page 10):
7-point Likert scale: Continuity of warmth/coolness movement (1: discrete/no movement to 7: perfectly continuous)

Study 4 (page 11-12):
Staircase method: Participants compared hydroptical water to reference water, reporting which felt warmer
Reference water temperature adjusted until perceived equality
Water temperature of subjective equality calculated from last 4 reversals

Physical measurements (all studies):
Skin temperature via thermistors (Alpha Technics)
Water temperature monitoring""",
    "6": """In sum: JND, forced-choice: Y/N.

Multiple methods across three tasks:
Task 1: Just Noticeable Difference (JND) - Staircase Method (page 5):
Participants compare two sets of 5 breaths (one with thermal stimulus, one without)
Forced choice: "Does one set feel easier to breathe?"
Temperature adjusted by 0.5°C increments based on response
Staircase ends after 4 reversals or 20 trials
JND = average temperature at reversals

Task 2: Range Characterization (pages 5-6):
Starting from JND, participants compare consecutive intensity levels
If difference noticed, establishes new distinguishable level
Continues until discomfort/pain or 20 trials
Measures number of perceivable levels and temperature steps between them

Task 3: Qualitative Interview (page 6):
Open-ended descriptions of sensations
Prompted analogies to real-world experiences
Feedback about study experience

Qualitative coding (page 6, Figure 10):
Transcribed comments classified as:
Airflow (breathing, patency, congestion, ease/difficulty)
Temperature (hot/cold sensations)
Tactile (tingling, skin sensations, pain)

Physical measurements:
Skin temperature: Thin 10kΩ thermistors (TME, B3950)
Air pressure: Differential sensor monitoring breathing
Baseline temperature: Thermistor + silicone tube (1mm ID, 2mm OD) in nostril""",
    "7": """Questionnaire. 9-point. Specifically:

Study 1 (Duration, page 6-7) --- 9-point Likert scale for cold intensity:
[1: "Do not feel at all", 9: "Cold as ice"]
Measured after 15, 30, 60, 120 minutes post-application.
Control: Fan-only condition (no alcohol) on opposite hand.

Study 2 (Perfume, page 9) --- 9-point bipolar Likert scale for thermal sensation:
[-4: "very cold", 0: neutral, +4: "very hot"]

Temporal-Check-All-That-Apply (TCATA) method:
Participants press GUI button whenever sensation changes OR at least once per minute.
Captures temporal dynamics of thermal sensation over 30-minute sessions.

Three conditions compared:
Perfume (alcohol + menthol fragrance)
90 vol% ethanol only
Fan-only (no chemical application)

Post-study qualitative feedback:
Open-ended descriptions of sensations
Comparisons to real-world experiences""",
    "8": """Study 1: rate cool or warm.
Study 2: ASHRAE scale (7-point, -3 to 3).

--- Specifically:

Study 1: Trigeminal Scent Comparison (page 6)
Task: Pairwise comparison of 6 scents + 3 solvents
Measurement:
Visual-analog scale (VAS) with 110mm range
Only extreme annotations: "cool" and "warm" endpoints
No numerical labels (prevents anchoring bias)
Participants rate both stimuli in each pair

Study 2: VR Temperature Rendering (page 7)
Task: Explore VR scenes (desert oasis, icy mountain) for 2+ minutes
Measurement:
ASHRAE 7-point bipolar Likert scale
Specifically designed for temperature perception
Range: -3 (cool) to +3 (warm)
Standard in thermal comfort research""",
    "9": """No direct measure.

The authors collected preferences and qualitative descriptions of thermal experiences:
Temperature preference counts: (Table 4, page 6) 5 participants preferred warm, 7 participants preferred cold…

Perception of Temperature Effects on Vibrations via Qualitative interviews (page 5, section 3.3.1).
Open-ended comments about how temperatures felt: (Page 5, Section 3.3.1) "Six participants made comments beyond stating a temperature preference, all of which highlighted neutral or negative aspects about thermal cues. Cold stimuli were described as 'sharp' or 'almost painful', while warm stimuli were described as feeling 'alarming', 'dangerous' or 'worrying'.""",
    "10": """Rate temperature perception, comfort based on Arens et al. [3]. (page 68).

The authors used four measurement approaches:
Quantitative Measurements (Likert scales):
Q1: Temperature Perception - 9-Point Likert scale
Question: "How do you rate the thermal sensation?"
Scale: ranging from very cold to very hot

Q2: Thermal Comfort - 6-Point Likert scale
Question: "How do you rate the thermal comfort?"
Scale: ranging from very comfortable to very uncomfortable (no neutral level)

Q3 & Q4: Involvement - 7-Point Likert scales
Q3: "How much did the visual aspects involve you?"
Q4: "How much did the thermal aspects involve you?"
Scale: ranging from not involved at all to completely involved

Reference: Page 6, Section "Task and Dependent Variables (DV)".""",
    "11": """Quantitative Measurements:
10-point Likert scale - rate the intensity of coldness, pressure, vibration, and pain.

Also estimate the area of cold sensation, - Analog scale in millimeters.""",
    "12": """Study 1: No measurement on thermal perception.

Study 2: JND study, page 7. Specifically:
Task: Compare water temperature between bare hand and DexteriSync hand.
Question: "Are these two cups the same temperature? Yes or No".

Started at different temperatures (17°C or 30°C)
Adjusted in increments based on responses (1.5-3°C increases, 0.5-1.5°C decreases).
Stopped when participant confirmed cups felt identical.

Objective measures:
Perceived temperature equivalence point - temperature at which DexteriSync hand felt same as bare hand (24°C).

Confidence check: Verbal confirmation of decision certainty.

Technical Evaluation: Direct Skin Temperature Measurement.

--- Side note

Instrumentation:
K-type thermocouple attached to palm-side finger front (volar surface).
Measured actual skin temperature changes over time.

Measurements:
Temperature readings at multiple time points (0, 5, 10, 15 minutes).

Analysis:
Perceived vs. actual temperature comparison.
Linear regression model fitted: y = -5.304 + 1.136x, R² = 0.44.
Time-series temperature profiles.""",
    "13": """No direct measures. Focus on experiential qualities extracted from poems.

The primary method of understanding thermal perceptual experience is via Lexical Analysis of Poetry, using the Grounded theory.""",
    "14": """In study 1, participants identify which and how many fingers the cues delivered to. So it's a Y/N cue type of evaluation.""",
    "15": """Can't tell in study 1, they ask participants to identify the thermal-pressure patterns they felt, but authors did not explain the procedure.
Not really in study 2. They used HX model to evaluate haptic experience, not specific to temperature or pressure in this case.

--- Side note
Study 1 (Recognition Test): Participants identified stimulated patterns and stiffness from 10 combinations (5 patterns × 2 stiffness levels) for both cool and warm stimuli. Results compiled in confusion matrices showing recognition accuracy (Pages 5-6, Sections 4.2.2 and 4.3, Figure 8).
Study 2 (User Experience Evaluation): Used the HX (Haptic Experience) model survey with 7-point Likert scales measuring five facets: Autotelic, Expressivity, Immersion, Realism, and Harmony (Page 8, Section 5, and Page 9, Section 5.2, Figure 12).""",
    "16": """During the study: Questionnaire, see page 6 (highlighted), and verbal feedback during the study.
After: debriefing conversations.""",
    "17": """No measures. No study.
The authors do NOT measure people's thermal perception. There are no user studies, experiments, or evaluations reported in this paper. The work is a system design paper presenting only the technical implementation (Page 2, Section 5 mentions future work will investigate "user perception and comfort levels").""",
    "18": """No direct measure.

Instead, they did:
Pain intensity measured using Universal Pain Assessment Tool before and after device use (Page 3, Section 3; Page 4, Figure 5)
Pain Rate Percentage Change (PRPC) calculated using the formula: (Pain Rate Before - Pain Rate After) / Pain Rate Before × 100 (Page 3, Section 3, Equation 1)
Correlation between temperature and pain analyzed through mean pain rate at different temperature levels (Page 4, Figure 6)""",
    "19": """No measure.

Instead, they measured:
Grasp Aperture (GAp): Distance between index finger tip and thumb tip during grasp (Page 5, Section "Metrics - Grasp Aperture," Equation 1)
Grasp Location: Where on the mug participants chose to grasp (handle, body/side, or top) (Page 5, Section "Grasp Location," Figure 5)
Grasp Type: Classification using Human GRASP taxonomy (power, intermediate, or precision grasps) (Page 5, Section "Grasp Type")
IPQ Presence Questionnaire: 14-item questionnaire measuring General Presence, Spatial Presence, Involvement, and Experience Realism on 7-point scales (Page 5, Section "Presence Questionnaire")
Post-test questionnaire: Assessed perceived usefulness of visual thermal cues and their influence on grasping decisions (Page 5, Section "Post-Test Questionnaire")""",
    "20": """Evaluation 1 - Haptic Identification in Cold Feedback:
Identification accuracy for three tasks measured at three temperature conditions:
Identify if haptic intensity increased, decreased, or stayed constant (Page 12, Section 5.3)
Identify if haptic diameter increased, decreased, or stayed constant (Page 12, Section 5.3)
Identify location of haptic stimulus on hand (9 locations) (Page 12, Section 5.3)

Evaluation 2 - Perceptual threshold: Number of visual particles at which users detected mismatch between haptics and visuals
Preference ratings: User preference ranking of four rendering schemes in light/heavy conditions (Page 17, Figure 12)

Evaluation 3 - User Experience:
Measured across 4 modality conditions: No Feedback, Tactile, Cold, Cold-Tactile
Subjective ratings (0-1 scale via visual analog scale):
Immersion: "The feedback condition was immersive and kept me engaged"
Enjoyment: "I enjoyed interacting with the scene"
Overall Satisfaction: "I felt that the feedback condition was satisfying\"""",
    "21": """Hand skin temperature.

Thermal comfort: two questionnaires: Bedford thermal scale, thermal sensation scale (page4).

1. Thermal Sensation Scale (Lee et al. [72]):
Continuous visual analog scale (0 to 1)
Question: "How do you feel at this time?"
Range: "very cold" (0) to "very hot" (1)
Assessed 3 times during each condition: at 90s, 180s, and 270s
Administered in VR during gameplay
(Page 4, Section 3.2.2; Page 6-7, Figure 3 left)

2. Bedford Thermal Comfort Scale [19]:
7-point Likert scale (1 to 7)
Question: "How would you rate your thermal comfort during the last scene?"
Range: "much too cool" (1) to "much too hot" (7)
Assessed once after each condition in neutral VE
Administered retrospectively
(Page 4, Section 3.2.2; Page 6-7, Figure 3 right)

--- Side note on skin temperature:
Continuously recorded at 4 Hz using thermocouples on both hands
Average of both hands calculated
Data transformed by subtracting first observation from each value to center at zero
(Page 4, Section 3.2.1; Page 5, Section 3.3)""",
    "22": """No measure.
They did not use objective thermal perception measurements (e.g., temperature thresholds, thermal sensation votes, physiological measures).
Only the VR experience with a customised questionnaire.

--- Side note
For VR experience:
The authors used a custom questionnaire with 7-point Likert scale (7 = totally agree, 1 = totally disagree) to measure enjoyment, realism, quality, and immersion. They also conducted short interviews.""",
    "23": """No direct measures.

--- Some details for reference
Note: The ASHRAE scale was not used as a direct measurement tool given to participants, but only as the output format of their thermal sensation prediction models.

They measured the usability of the touchable UI instead:
Behavioral Measures:
Number of setpoint adjustments - counted automatically by the system
Setpoint positions - initial, final, and all intermediate adjustments recorded
Which setpoints tested - recorded when participants touched different temperature settings
Estimated comfort range - participants defined min/max comfortable setpoint range

Qualitative Self-Reports:
Think-aloud protocols - participants verbalized reasons for setpoint changes during interaction
Open-ended questionnaire responses:
Strategy used during session
Factors influencing setpoint choice
How they anticipated thermal sensation changes
How they interpreted touch-based thermal sensation
Perceived mapping between touch and global sensation

7-Point Likert Scale Ratings (NOT ASHRAE scale):
Session 1 (baseline without thermal feedback): Usability baseline:
Influence of UI on setpoint adjustment behavior

Session 2 (with thermal feedback):
Appropriateness of mapping between touch-based and global sensation
Ease of finding satisfying setpoint
Influence of visual feedback on setpoint choice
Influence of touch-based sensation on setpoint choice
Easiness of setpoint adjustment task
Precision of setpoint adjustment task

Post-Experience Satisfaction Rating:
Final thermal sensation rating: Whether it matched expectations (7-point scale, NOT the ASHRAE -3 to +3 scale):
"better than expected" vs "matched expectations" vs "worse than expected"

Physiological Measurement:
Fingertip skin temperature - measured continuously using MCP9808 sensor

Pages 5-7 (Sections 6.2, 6.3, 7 - Results)""",
    "24": """Study 1,2 - They measure whether people feel the thermal cue, and if yes, draw the thermal location on their hands.

--- Note on details.
Subjective Perception Measures:

Binary perception detection:
Asked if participants felt thermal sensations (Yes/No)
Recorded occurrence rate of perceived thermal sensation

Spatial perception mapping:
Participants drew perceived thermal areas on hand images displayed on Samsung tablet using stylus pen
Created heatmaps showing distribution and intensity of perceived thermal sensations
Measured perceived thermal coverage

Response time:
Measured how quickly participants detected thermal sensations

Qualitative Measures (User Study 3):
Semi-structured interviews:
Open-ended questions about thermal sensations experienced
Comparisons to real-life experiences
Descriptions of distinct thermal sensations
Thermal illusions (e.g., wetness sensation)
Satisfaction with thermal feedback

Audio recordings of study sessions

What they did NOT measure:
Objective thermal discrimination thresholds
Just-noticeable differences (JND)
Thermal sensation intensity ratings on standardized scales
Physiological responses (skin conductance, temperature)
Accuracy of temperature estimation""",
    "25": """Bedford thermal scale, from very cold to very hot, 9 levels.

They also measured congruency and presence, see page 7.

--- Side note.
What was NOT measured:
- Actual skin temperature changes
- Thermoreceptor activation
- Physiological thermal responses
- Thermal discrimination thresholds""",
    "26": """Study 1 - Threshold Measurement (Psychophysical Method): psychometric test, yes or no in perception. Forced-choice paradigm - Yes/No response per trial. They measured temperature at which users start perceiving warm sensations, and temperature at which pain begins to be felt.

Study 2 - Pattern Identification (Indirect thermal perception assessment): participants answer which part of their hand they feel the cues (pattern).

Study 3 - No measure. Subjective Experience (Questionnaire) on immersion, enjoyment and overall satisfaction.

--- Side note:
What is not measured:
- Absolute temperature discrimination (e.g., "Is this 35°C or 40°C?")
- Thermal comfort scales
- Just-noticeable differences (JND) for temperature
- Spatial resolution of thermal perception
- Temporal sensitivity to temperature changes
- Physiological responses (skin temperature, sweating)""",
    "27": """No measure.
What was measured is the length of handheld objects.""",
    "28": """Not measured.
What was measured is subjective meditation experiences.""",
    "29": """Yes, how accurate and fast participants can identify perceived thermal patterns.""",
    "30": """No direct measure.

--- Instead, they did:
Participants traced perceived thermal position on iPad interface
Pleasantness ratings on 7-point Likert scale (-3 to 3)
Analysis of thermal movement distance (Xdif), position (Xmean), and area (Smean)""",
    "31": """EXP1 (on chest thermal perception & comfort): perceived thermal intensity.
Perceived intensity (7-point Likert scale)
Perceived comfortness (7-point Likert scale)
Perceptual reaction time
Self-report (think aloud)
Room and skin temperature""",
    "32": """Test 1: Measured the SPR (skin potential response), a psychophysiological measure used to assess emotional arousal during thermal+music conditions (Test 1, p.48).

The pre-main experiment: volunteers were exposed to three levels of temperature variation (1°C, 2°C, and 3°C) and asked to choose the most comfortable range.""",
    "33": """N/A

The paper relied on self-reported expectations in online surveys. Participants selected "warm touch" parameters (body location, intensity, pattern) for communicating emotions and described their thought processes through open-ended responses. There was no psychophysical or physiological measurement of thermal sensation.""",
    "34": """No measure on thermal perception, but on pain levels.
Numerical Rating Scale (NRS, 0–10) used for pain intensity rating,
McGill pain questionnaire used for indicating the perceived pain type (page 11).""",
    "35": """No measure. The authors used the Self-Assessment Manikin (SAM), a non-verbal emotional rating scale measuring pleasure, arousal, and dominance, to assess the effect of thermal feedback on subjective movie experience. No psychophysical thermal threshold measurement was conducted.""",
    "36": """No measure.

However, warmth was mentioned positively in free-response comments: out of 256 hug surveys, the physical warmth of the robot was mentioned positively 100 times (39%). These qualitative mentions served as informal validation of Tenet 2 but no quantitative thermal perception measure was used. (Section 6 Results)""",
    "37": """Tangentially. Thermal perception was assessed qualitatively through semi-structured interviews exploring participants' awareness of the thermal patterns, their ability to distinguish patterns, and their perceived bodily origin of the thermal sensations.
(The discussion is around meditation, attention, body awareness.)""",
    "38": """Eleven adult participants wore the mask and were asked to identify which of five facial zones was being heated (right forehead, left eyebrow, below the left eye, right cheek, chin) without visual confirmation. The measure was accuracy rate.""",
    "39": """Indirectly. Study 1: They measured haptic perception by asking participants to pick one out of nine "haptic descriptors". (results in fig 10)
Study 2, immersion (not thermal perception per se) was rated on a 7-point Likert scale after each VR scene; qualitative comments also captured warm and cold perceptions.""",
    "40": """Questionnaire: Participants reported the perception of cold from the device on a Likert scale of 0–10 as part of the post-trial questionnaire. (number, intensity... of chills, page 153, section 4.4.4)""",
    "41": """No measure on the thermal perception.
Participants rated their "temperature liking" on a 9-point hedonic scale as one of the liking dimensions after each stimulus condition. Thermal perception was not assessed independently but folded into the hedonic liking ratings. The Just-About-Right (JAR) scale was used for flavor sensations""",
    "42": """No measure.

Perception of the thermal feedback was qualitatively reflected via post-task interviews. All 12 participants reported that they understood the thermal feedback and found the temperatures comfortable and distinguishable.""",
    "43": """Study 1: After each thermal directional cue, participants answer the direction of the cue and hot/cold cue they were perceiving.
Study 2: No direct measurement on thermal perception. They asked two questions:
Q1 — "How much did the visual aspects of the environment involve you?"
Q2 — "How much did the thermal aspects of the environment involve you?" (p.5453, Study 2 subsection)""",
    "44": """No.
They measured the emotional meaning participants attributed to thermal stimuli.""",
    "45": """N/A

The authors did not measure thermal perception through any psychophysical or physiological instrument. Instead, participants' experiences of cold were captured qualitatively through observation notes, semi-structured group interviews, and open-ended questionnaire responses. Verbal expressions such as feeling cold, freezing, and the desire to go inside were recorded as behavioral and experiential indicators (pp. 7–8, Sections 3.1–3.2).""",
    "46": """"Response accuracy":
Study 1, participants were trained on different temperature levels and then asked to identify which level was being presented, using a keyboard response. Recognition accuracy was the dependent measure.
Study 2, participants compared their ability to perceive externally applied temperature stimuli from a 20×20mm Peltier module both with and without wearing the HydroRing in passive mode, again using verbal identification of stimulus levels. Accuracy was compared between baseline and augmented conditions (pp. 918–920, Study 1 and Study 2).""",
    "47": """Thermal pattern identification task: participants identified which of six thermal patterns was presented, using a visual template on screen as a reference. Performance was quantified via percentage correct responses and Information Transfer (IT) values in bits.

Experiment 1 was an absolute identification study in which participants had to identify which of six thermal patterns was presented on the tips of the index and middle fingers. Skin temperature was also physiologically measured continuously via thermistors throughout all experiments.""",
    "48": """N/A

No measure on people perceiving temperature. Only measured on robot side for temperature control.""",
    "49": """No — they measured wetness perception induced by thermal stimuli (cold, dry surfaces), rather than thermal perception per se.

The authors measured the subjective rating of perceived wetness, rating from 0 (dry)-4 (wet):
Study 1: Participants rated their wetness sensation on a continuous scale from 0 (dryness) to 4 (feeling of putting a finger in water), along with separate ratings for pressure and friction sensation (same 0–4 scale)
Study 2: Participants rated wetness perception on a 5-point Likert scale ("I felt that I just touched [the item]": 0 = not at all, 4 = exactly the same) for RQ1, and identified the correct wetness level (least wet, middle wet, most wet) from three sequential presentations for RQ2.""",
    "50": """N/A

Chemical haptics targets chemesthetic sensations (tingling, numbing, stinging) rather than thermal perception. Participant studies focused on distinguishing and rating these chemical haptic effects, not temperature perception thresholds or thermal comfort.""",
}
