export const maxDuration = 60;
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialized OpenAI client with deepseek api key and base url
const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.DAI_API_KEY
});

export async function POST(req) {
    try {
        const { userId } = getAuth(req)

        // Extract chatId and prompt from the request body
        const { prompt, chatId } = await req.json()

        if(!userId) {
            return NextResponse.json({
                success: false,
                message: "user not authenticated",

            })
        }

        // Find the chat document in the database based on userId and chatId
        await connectDB();
        const data = await Chat.findOne({userId, _id: chatId})

        // Create a user message object
        const userPrompt = {
            role: "user",
            content: prompt,
            timestamp: Date.now()
        };

        data.messages.push(userPrompt);

        // Call the deepseek api to get the chat completion
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }],
            model: "deepseek/deepseek-chat-v3-0324:free",
            store: true,
        });

        const message = completion.choices[0].message;
        message.timestamp = Date.now()

        data.messages.push(message);
        data.save();

        return NextResponse.json({
            success: true,
            data: message
        })

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message
        })
    }
}