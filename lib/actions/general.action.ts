"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { FieldPath } from "firebase-admin/firestore";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate in detail and generate structured feedback.

        Transcript:
        ${formattedTranscript}

        For each category below, give a score from 0 to 100 and a comment that is at least 2 sentences long. Use the exact category names provided.
        - Communication Skills: Clarity, articulation, structured responses.
        - Technical Knowledge: Understanding of key concepts for the role.
        - Problem Solving: Ability to analyze problems and propose solutions.
        - Cultural Fit: Alignment with company values and job role.
        - Confidence and Clarity: Confidence in responses, engagement, and clarity.

        Also provide:
        - strengths: a list of at least 3 specific strengths
        - areasForImprovement: a list of at least 3 specific areas to improve
        - finalAssessment: a short paragraph summarizing the candidate's overall performance and top recommendation
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. You should be honest, specific, and detailed in your feedback.",
    });

    const feedback = {
      interviewId,
      userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    const feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    return {
      success: true,
      feedbackId: feedbackRef.id,
    };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return {
      success: false,
    };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  if (!interview.exists) return null;

  return {
    id: interview.id,
    ...interview.data(),
  } as Interview;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];

  return {
    id: feedbackDoc.id,
    ...feedbackDoc.data(),
  } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .orderBy("createdAt", "desc")
    .limit(limit * 2)
    .get();

  return interviews.docs
    .filter((doc) => doc.data().userId !== userId)
    .slice(0, limit)
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const feedbackSnapshot = await db
    .collection("feedback")
    .where("userId", "==", userId)
    .get();

  if (feedbackSnapshot.empty) return [];

  const interviewIds = Array.from(
    new Set(
      feedbackSnapshot.docs
        .map((doc) => doc.data().interviewId)
        .filter(Boolean) as string[]
    )
  );

  if (!interviewIds.length) return [];

  const interviews: Interview[] = [];

  for (let i = 0; i < interviewIds.length; i += 10) {
    const chunk = interviewIds.slice(i, i + 10);
    const snapshot = await db
      .collection("interviews")
      .where(FieldPath.documentId(), "in", chunk)
      .get();

    interviews.push(
      ...snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Interview[]
    );
  }

  return interviews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
