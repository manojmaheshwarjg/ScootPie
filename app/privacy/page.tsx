'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-mono text-xs uppercase tracking-widest">Back to App</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12">
                <div className="flex items-center gap-3 mb-8">
                    <Shield className="w-8 h-8 text-accent" />
                    <h1 className="font-serif text-2xl md:text-4xl font-bold italic">Privacy Policy</h1>
                </div>

                <p className="text-gray-400 mb-8 font-mono text-sm">
                    Last Updated: January 29, 2025
                </p>

                <div className="prose prose-invert prose-orange max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">1. Introduction</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Welcome to ScootPie (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). ScootPie is an AI-powered virtual try-on platform that allows users to visualize how clothing items would look on them before purchasing. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services at scootpie.com (the &quot;Service&quot;).
                        </p>
                        <p className="text-gray-300 leading-relaxed">
                            By using ScootPie, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies, please do not use our Service.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">2. Information We Collect</h2>

                        <h3 className="text-xl text-accent mt-6">2.1 Personal Information</h3>
                        <p className="text-gray-300 leading-relaxed">We may collect the following personal information:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Account Information:</strong> Email address, name, and profile picture (if using Google OAuth)</li>
                            <li><strong>Authentication Data:</strong> Login credentials and session tokens</li>
                            <li><strong>Contact Information:</strong> Email address for account-related communications</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">2.2 User-Generated Content</h3>
                        <p className="text-gray-300 leading-relaxed">To provide our virtual try-on service, we collect:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Photos:</strong> Full-body photographs you upload for virtual try-on purposes</li>
                            <li><strong>Body Measurements:</strong> Estimated body dimensions derived from your photos using AI</li>
                            <li><strong>Wardrobe Data:</strong> Clothing items you save to your virtual wardrobe</li>
                            <li><strong>Generated Images:</strong> AI-generated try-on images created from your photos</li>
                            <li><strong>Style Preferences:</strong> Your fashion preferences and styling choices</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">2.3 Automatically Collected Information</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
                            <li><strong>Usage Data:</strong> Pages visited, features used, interaction patterns</li>
                            <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
                            <li><strong>Cookies:</strong> Session cookies and authentication tokens</li>
                        </ul>
                    </section>

                    {/* How We Use Your Information */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">3. How We Use Your Information</h2>
                        <p className="text-gray-300 leading-relaxed">We use your information to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Provide and maintain our virtual try-on service</li>
                            <li>Process and generate AI-powered clothing visualizations</li>
                            <li>Authenticate and secure your account</li>
                            <li>Save your wardrobe and generated looks to your account</li>
                            <li>Improve our AI models and service quality</li>
                            <li>Send account-related emails (login links, password resets)</li>
                            <li>Respond to customer support requests</li>
                            <li>Detect and prevent fraud or abuse</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    {/* AI Technology and Data Processing */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">4. AI Technology and Data Processing</h2>

                        <h3 className="text-xl text-accent mt-6">4.1 AI Image Processing</h3>
                        <p className="text-gray-300 leading-relaxed">
                            ScootPie uses advanced artificial intelligence technologies to process your photos and generate virtual try-on images. This includes:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Google Gemini AI:</strong> For image analysis, body pose detection, and clothing visualization</li>
                            <li><strong>Runway ML:</strong> For generating video animations of try-on results</li>
                            <li><strong>Computer Vision:</strong> To detect body contours and ensure accurate clothing placement</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">4.2 Photo Processing</h3>
                        <p className="text-gray-300 leading-relaxed">
                            When you upload a photo, our AI systems may:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Analyze body pose and proportions</li>
                            <li>Detect clothing boundaries and body contours</li>
                            <li>Generate virtual try-on composites</li>
                            <li>Create 3D body estimations for fit visualization</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">4.3 Third-Party AI Services</h3>
                        <p className="text-gray-300 leading-relaxed">
                            Your images may be processed by third-party AI providers (Google, Runway) subject to their respective privacy policies. We only share the minimum data necessary for processing.
                        </p>
                    </section>

                    {/* Data Storage and Security */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">5. Data Storage and Security</h2>

                        <h3 className="text-xl text-accent mt-6">5.1 Data Storage</h3>
                        <p className="text-gray-300 leading-relaxed">
                            Your data is stored using Supabase, a secure cloud database platform. This includes:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>User account information</li>
                            <li>Uploaded photos (stored as base64 or cloud URLs)</li>
                            <li>Generated try-on images</li>
                            <li>Wardrobe and saved looks</li>
                            <li>Chat history with AI stylist</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">5.2 Security Measures</h3>
                        <p className="text-gray-300 leading-relaxed">We implement industry-standard security measures:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>HTTPS encryption for all data transmission</li>
                            <li>Secure authentication via Supabase Auth</li>
                            <li>Row-level security (RLS) for database access</li>
                            <li>Regular security audits and updates</li>
                            <li>Secure API key management</li>
                        </ul>
                    </section>

                    {/* Data Sharing */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">6. Data Sharing and Disclosure</h2>
                        <p className="text-gray-300 leading-relaxed">We do not sell your personal information. We may share data with:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Service Providers:</strong> Supabase (database), Google (AI), Runway (video generation), Resend (email)</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                        </ul>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">7. Your Rights</h2>
                        <p className="text-gray-300 leading-relaxed">You have the right to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Update or correct your account information</li>
                            <li><strong>Deletion:</strong> Delete your account and associated data</li>
                            <li><strong>Portability:</strong> Export your wardrobe and generated looks</li>
                            <li><strong>Withdraw Consent:</strong> Revoke permissions at any time</li>
                        </ul>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            To exercise these rights, access your Account Settings or contact us at support@scootpie.com.
                        </p>
                    </section>

                    {/* Cookies */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">8. Cookies and Tracking</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We use essential cookies for authentication and session management. We do not use third-party advertising cookies or tracking pixels.
                        </p>
                    </section>

                    {/* Children's Privacy */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">9. Children&apos;s Privacy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            ScootPie is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
                        </p>
                    </section>

                    {/* International Users */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">10. International Data Transfers</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Your data may be transferred to and processed in countries other than your own, including the United States. We ensure appropriate safeguards are in place for such transfers in compliance with applicable laws.
                        </p>
                    </section>

                    {/* Changes */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">11. Changes to This Policy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">12. Contact Us</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-4 mt-4">
                            <p className="text-white font-mono">ScootPie</p>
                            <p className="text-gray-400">Email: support@scootpie.com</p>
                            <p className="text-gray-400">Website: https://scootpie.com</p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="font-mono text-xs text-gray-500">© 2025 ScootPie. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
