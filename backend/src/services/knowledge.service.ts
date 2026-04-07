import prisma from '../config/db';

/** BKT Constants */
const P_INITIAL = 0.20;  // Pre-test probability (default 20% knowledge)
const P_LEARN = 0.10;    // Prob. of transitioning from "Not Known" to "Known"
const P_GUESS = 0.25;    // Prob. of guessing correctly if "Not Known"
const P_SLIP = 0.10;     // Prob. of slipping (incorrect) if "Known"
// Note: These are standard defaults; they can be tuned for each concept.

export class KnowledgeService {

  /** Update Mastery based on Bayesian Knowledge Tracing */
  static async updateMastery(studentId: string, conceptId: string, isCorrect: boolean) {
    const current = await prisma.studentMastery.findUnique({
      where: { student_id_concept_id: { student_id: studentId, concept_id: conceptId } },
    });

    const pOld = current ? current.mastery_prob : P_INITIAL;

    /** BKT Update Rule 
     * P(K_t | Obs) = P(K_t-1 | Obs) / [P(K_t-1) * P(Obs | K) + (1-P(K_t-1)) * P(Obs | G)]
     * then, P(K_t+1) = P(K_t) + (1 - P(K_t)) * P_LEARN
     */
    let pConditional: number;
    if (isCorrect) {
      // Correct observation logic
      pConditional = (pOld * (1 - P_SLIP)) / (pOld * (1 - P_SLIP) + (1 - pOld) * P_GUESS);
    } else {
      // Incorrect observation logic
      pConditional = (pOld * P_SLIP) / (pOld * P_SLIP) + (1 - pOld) * (1 - P_GUESS);
    }

    const pNew = pConditional + (1 - pConditional) * P_LEARN;
    
    // Clamp between 0.001 and 0.999 to avoid math edge cases
    const clampedP = Math.min(Math.max(pNew, 0.001), 0.999);

    return await prisma.studentMastery.upsert({
      where: { student_id_concept_id: { student_id: studentId, concept_id: conceptId } },
      update: {
        mastery_prob: clampedP,
        attempt_count: { increment: 1 },
        correct_count: isCorrect ? { increment: 1 } : undefined,
        last_seen: new Date(),
      },
      create: {
        student_id: studentId,
        concept_id: conceptId,
        mastery_prob: clampedP,
        attempt_count: 1,
        correct_count: isCorrect ? 1 : 0,
        last_seen: new Date(),
      }
    });
  }

  /** Identify the root cause of a knowledge gap by traversing the graph */
  static async identifyGaps(studentId: string, targetConceptId: string) {
    const concept = await prisma.concept.findUnique({
      where: { concept_id: targetConceptId },
      include: { 
        prerequisites: {
          include: { studentMasteries: { where: { student_id: studentId } } }
        }
      }
    });

    if (!concept || !concept.prerequisites.length) return null;

    // Filter prerequisites where the student's mastery is below 60%
    const gaps = concept.prerequisites.filter(p => {
      const mastery = p.studentMasteries[0]?.mastery_prob || P_INITIAL;
      return mastery < 0.60;
    });

    return gaps;
  }

  /** Get the "Student Knowledge Graph" - concepts with mastery colors */
  static async getStudentGraph(studentId: string) {
    const concepts = await prisma.concept.findMany({
      include: {
        prerequisites: { select: { concept_id: true } },
        studentMasteries: { where: { student_id: studentId } }
      }
    });

    return concepts.map(c => ({
      id: c.concept_id,
      name: c.concept_name,
      chapter: c.chapter,
      mastery: c.studentMasteries[0]?.mastery_prob || P_INITIAL,
      prerequisites: c.prerequisites.map(p => p.concept_id)
    }));
  }
}
