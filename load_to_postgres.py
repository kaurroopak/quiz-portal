import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import uuid

# ── Connection ──────────────────────────────────────────────
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='quizportal',
    user='ananya',
    password='strongpassword'
)
cur = conn.cursor()

# ── 1. GET ADMIN USER ID AUTOMATICALLY ──────────────────────
cur.execute("""
SELECT id FROM users 
WHERE email = 'admin@quiz.com'
LIMIT 1
""")

admin = cur.fetchone()

if not admin:
    raise Exception("Admin user not found. Create admin first.")

created_by = admin[0]
print("Using admin:", created_by)


# ── 2. CREATE QUIZ ──────────────────────────────────────────
quiz_id = str(uuid.uuid4())

cur.execute("""
INSERT INTO quizzes (
    id,
    title,
    description,
    created_by,
    duration_seconds,
    shuffle_questions,
    status
) VALUES (%s,%s,%s,%s,%s,%s,%s)
""", (
    quiz_id,
    "Electricity Diagnostic Quiz",
    "Loaded from Excel",
    created_by,
    1800,
    False,
    "active"
))

conn.commit()
print("Created quiz:", quiz_id)


# ── 3. LOAD QUESTIONS ───────────────────────────────────────
df_q = pd.read_excel(
    'Synapse_Quiz_30Q.xlsx',
    sheet_name='Quiz_Questions',
    header=1
)

df_q = df_q.dropna(subset=['Q#'])
df_q['question_id'] = ['Q' + str(int(q)).zfill(3) for q in df_q['Q#']]

def safe(val):
    return str(val) if pd.notna(val) else None


question_rows = [
    (row.question_id, quiz_id,
     safe(row.Chapter),
     safe(row.concept_id),
     safe(row.Bloom),
     int(row.Difficulty) if pd.notna(row.Difficulty) else None,
     safe(row.Type),
     safe(row['Question Stem']),
     safe(row['Option A']),
     safe(row['Option B']),
     safe(row['Option C']),
     safe(row['Option D']),
     safe(row['Correct Answer']),
     safe(row['Correct Reasoning']),
     safe(row['Wrong A — Confusion / Weak Topic']),
     safe(row['Wrong B — Confusion / Weak Topic']),
     safe(row['Wrong C — Confusion / Weak Topic']),
     safe(row['Wrong D — Confusion / Weak Topic'])
    )
    for _, row in df_q.iterrows()
]


# ── 4. INSERT QUESTIONS WITH QUIZ RELATION ──────────────────
execute_values(cur, """
INSERT INTO questions
(question_id, quiz_id, chapter, concept_ids, bloom_level, difficulty,
 question_type, stem, option_a, option_b, option_c, option_d,
 correct_answer, correct_reasoning,
 wrong_a_confusion, wrong_b_confusion,
 wrong_c_confusion, wrong_d_confusion)
VALUES %s
ON CONFLICT (question_id) DO UPDATE
SET quiz_id = EXCLUDED.quiz_id
""", question_rows)

conn.commit()

print(f"Linked {len(question_rows)} questions to quiz:", quiz_id)


cur.close()
conn.close()