"""Body parts involved notes keyed by paper id (1–50)."""

BODY_PARTS_INVOLVED: dict[str, str] = {
    "1": "Ventral (inner) side of the forearm, between wrist and elbow.",
    "2": "Full body heat sensation in a sauna.",
    "3": "Posterior neck (page 1, Abstract and Figure 1)",
    "4": """Study 1 &2: ventral side of the forearm. --- page 5, 8
Study 3: Thermal at ventral center, tactile on dorsal (opposite) side. --- page 10""",
    "5": "Right hand and wrist all in water, light is only on the palm.",
    "6": """Nasal (in one nostril).

Target area include:
Nasal septum (wall dividing nostrils)
Nasal mucosa
Turbinates region""",
    "7": "Wrist (dorsal side, non-dominant arm) for all studies (pages 5-9), device worn as wristwatch (page 4-5, Figure 4), making wrist the practical location for wearable application.",
    "8": """Nasal area.
Nasal cavity - specifically trigeminal nerve endings in the nose (page 3)""",
    "9": "Palm - specifically the heel of the palm resting on the Peltier element, with fingers draping around the device (on the foams surrounding the peltier).",
    "10": "Right arm, abdomen (page 5-6)",
    "11": "Ventral (inside) part of the right forearm",
    "12": """Dorsal side of index finger and thumb.
Thumb (dominant hand)
Index finger (dominant hand).""",
    "13": "Discussed diverse body parts including inside/outside.",
    "14": "Five fingertips (distal phalanges), on non-dominant hand (page 7) and all participants were right-handed.",
    "15": """In the user study: lower arm, glabrous skin side.
In the other demos: bottom of the feet, palm.""",
    "16": """From back of a hand all the way up to shoulder edge.

The left arm was tested, including:

Hand (1 location: t_hand)
Lower arm (4 locations: t_lo1, t_lo2, t_lo3, t_lo4)
Upper arm (3 locations: t_up1, t_up2, t_up3)

(Page 3, Section 3.1; Page 2, Figure 2b)""",
    "17": 'Not specific. The paper mentions that heated air is directed "towards the user\'s body parts" (Page 1, Section 1) and specifically references "the user\'s hands or other body parts" (Page 2, Section 1). However, no specific body parts are identified for testing or evaluation.',
    "18": "abdominal part (pelvic area) and lower back are the body parts that receive thermal feedback (Page 1, Abstract; Page 1, Section 1).",
    "19": "N/A",
    "20": """Palm and fingers.
The system is specifically designed for bare hands with palms facing upward toward the ultrasound display (Page 4, Section 3.2; Page 11, Section 5.4).""",
    "21": "N/A",
    "22": """Whole body and hand, depends: Pages 2-3 (Sections 2.1, 3.1-3.3), Pages 5-6 (Section 5), Pages 8-9 (Section 6.2)

Ubiquitous-based haptics:
The device is designed to cover the user's whole body when positioned above the head, with effective coverage primarily on the upper body at 80cm height.
Users' hands and arms when within the effective area

Controller-based haptics:
Hands - the controller provides thermal feedback to users' hands during manipulation""",
    "23": 'Finger tip: "we chose fingertips because users primarily interact with thermostats using their hands, especially their fingers"',
    "24": """Study 1 - five fingers (ventral and dosal) and palm, see figure 3. They were "positioned in the center of the proximal phalanx for the thumb and middle phalanges for the other four fngers, on both the ventral (inner) and dorsal (outer) sides".
Study 2 - dosal side of fingers and palm.""",
    "25": "Not reported in the paper, but by common sense of mid-air haptic display, it's palm and ventral side of fingers.",
    "26": "palm and ventral side of fingers. The hand is horizontally outstretched.",
    "27": "hand - palm and fingers",
    "28": "Not reported. But there were mentions of diff body parts: forehead, stomach, chest, back (section 5.3).",
    "29": "auricular skin area (around the ear) - specifically front, top, back, and bottom positions around each ear.",
    "30": "fore arm water bag - create illusory moving thermal",
    "31": """chest wearable (mediated with fabrics):

"upper (central) chest (i.e., Sternum)" (Abstract, page 1)""",
    "32": """both ears, specifically the area between the sideburn and the tragus.

Why
The face/ear area was chosen because the threshold for thermal stimuli on the face is the lowest in the human body, making thermal stimuli more perceptible there. The area between the sideburn and the tragus was selected after briefly testing a number of sites around the ear, seeking a display site large enough to evoke thermal sensations but not cause discomfort from contact with the hard material of the Peltier device. (Hardware, p.46)""",
    "33": """N/A
IN the survey, participants could select from: torso, shoulders, upper arms, hands, and neck. (Section 3.1.1)""",
    "34": """Wrist, dorsal side.

Why?
The wrist was chosen as a common site for wearable devices and for practical demonstration purposes. The authors note that Douleur is similar in form to a smartwatch/smartband. No specific justification based on thermal sensitivity of the wrist is given. (Sections 3.4 and 2.2)""",
    "35": """Study 1: "inner sides of both wrists, both forearms located at the center, on the inner side of the wrist and elbow, and both on both ankles located on the heel side" (page 5).

WHY?
The design criterion of wearability drove the choice of body parts where a band-style device can be worn (similar to a smartwatch). The authors note that multiple body parts were chosen to express motion, embodiment, and to cover a wider area of the body than single-part systems. No specific thermal sensitivity justification for these locations is provided.""",
    "36": "No specific report. The part of the body involve hugging.",
    "37": """The front upper body from chest to navel, along a vertical axis. (Section 4.1; Figure 3)

Why?
The upper body was chosen because: (1) phenomenological studies of meditation show that meditators commonly experience warmth and interoceptive sensations in the chest and throat area; (2) following the breath naturally involves movement from chest to belly; (3) the chest was identified as the most thermally sensitive area of the upper body in the authors' somadesign exploration. The vertical placement also instantiates the movement-based metaphor (structured vs. random movement from chest to belly). (Sections 3.2, 4.2.1, 4.2.3)""",
    "38": 'In the user study: "right side of the forehead, left eyebrow, below the left eye, right cheek, and chin".',
    "39": """In the photo, it's on the face (cheeks) and forearm (ventral).
Cheeks: menthol (cooling) and capsaicin (warming) applied via a mask-style cheek patch beneath the VR headset
Forearm: all five chemicals were also tested on the forearm in Study 1 and some VR experiences in Study 2 (capsaicin warming was specifically on the cheeks in the VR walkthrough, but forearm was the primary Study 1 site)
They claim it can be worn anywhere. But it's not. You always need extra fixation to secure it.

Why these parts?
The cheeks were chosen because: (1) they are a natural site for ambient facial sensations (warmth/cold) commonly associated with environmental temperature; and (2) they illustrate the system's ability to deliver chemicals to hard-to-reach locations.
The forearm was chosen because: (1) it is an ideal site for sensations related to arm-based UIs, which are common in VR; and (2) the sleeve form factor can be adapted to other limbs. An additional practical rationale is given: cheek skin (~38.8μm thick) absorbs chemicals faster than forearm skin (~60.9μm thick), which is relevant to the speed of thermal sensation onset.""",
    "40": """shoulder and back: "upper left, upper center and upper right of the back, one on middle and one on the lower back".

Why these locations: (Page 151)
The back/spine was chosen because aesthetic chills are physiologically localised primarily in the spinal region, with peripheral sensations in the shoulders and forearms. The authors argue this makes aesthetic chills particularly well-suited for a metasomatic device: (1) the somatic marker of aesthetic chills is spatially isolated from basic emotions (which are largely localised in the face), reducing cross-contamination with other emotional priors; (2) the spinal sensation of "chills down the spine" is the defining reported prior of the psychogenic shiver experience; and (3) the universality of this somatic marker across cultures (cited as Ref [30]) supports the choice.""",
    "41": """Upper lips and nose area.
Why?
Not specified, self-evident.""",
    "42": """Forearm (three points along the arm: wrist, midpoint between wrist and elbow, and just below the elbow.), ventral side.

Why?
Not specified.
The arm placement appears to be a pragmatic choice for a wearable device that is easy to put on and remove.""",
    "43": """The face: three positions on the forehead (Fp1, FpZ, Fp2 in the EEG 10-20 system) and the area under each eye (modules 4 and 5). (p.5453, Implementation and Figure 2).

Why?
Not specified.""",
    "44": "Palm of dominant hand.",
    "45": "whole body",
    "46": "Fingertip, ventral. Dominant hand.",
    "47": """Experiment 1: the tips of their right index and middle fingers on the surface of the thermoelectric module
Experiment 2 & System ID: The wrist, ventral side.""",
    "48": "N/A",
    "49": "The right hand",
    "50": """Study 1: ventral side of index finger tip.
Study 2: ventral side of finger tips.""",
}
