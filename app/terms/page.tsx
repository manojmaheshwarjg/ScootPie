'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
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
                    <FileText className="w-8 h-8 text-accent" />
                    <h1 className="font-serif text-2xl md:text-4xl font-bold italic">Terms of Service</h1>
                </div>

                <p className="text-gray-400 mb-8 font-mono text-sm">
                    Last Updated: January 29, 2025
                </p>

                <div className="prose prose-invert prose-orange max-w-none space-y-8">
                    {/* Agreement */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">1. Agreement to Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            By accessing or using ScootPie (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you do not have permission to access the Service.
                        </p>
                        <p className="text-gray-300 leading-relaxed">
                            These Terms apply to all visitors, users, and others who access or use the Service. By using ScootPie, you represent that you are at least 13 years of age.
                        </p>
                    </section>

                    {/* Description of Service */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">2. Description of Service</h2>
                        <p className="text-gray-300 leading-relaxed">
                            ScootPie is an AI-powered virtual try-on platform that enables users to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Upload personal photos for virtual clothing try-on</li>
                            <li>Generate AI-powered visualizations of clothing on their body</li>
                            <li>Discover and match clothing items from various sources</li>
                            <li>Save and organize virtual wardrobe collections</li>
                            <li>Interact with an AI stylist for fashion recommendations</li>
                            <li>Create 3D body fit visualizations</li>
                            <li>Generate runway-style video animations</li>
                        </ul>
                    </section>

                    {/* User Accounts */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">3. User Accounts</h2>

                        <h3 className="text-xl text-accent mt-6">3.1 Account Creation</h3>
                        <p className="text-gray-300 leading-relaxed">
                            To access certain features, you must create an account using:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Google OAuth authentication</li>
                            <li>Email and password registration</li>
                            <li>Email magic link authentication</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">3.2 Account Responsibilities</h3>
                        <p className="text-gray-300 leading-relaxed">You are responsible for:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Maintaining the confidentiality of your account credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized access</li>
                            <li>Providing accurate and complete account information</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">3.3 Guest Access</h3>
                        <p className="text-gray-300 leading-relaxed">
                            You may use limited features as a guest without creating an account. Guest data is not persisted and will be lost when you close your browser.
                        </p>
                    </section>

                    {/* User Content */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">4. User Content</h2>

                        <h3 className="text-xl text-accent mt-6">4.1 Photo Uploads</h3>
                        <p className="text-gray-300 leading-relaxed">By uploading photos to ScootPie, you:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Grant us a limited license to process your photos for virtual try-on purposes</li>
                            <li>Confirm you have the right to upload and use the photos</li>
                            <li>Acknowledge that photos may be processed by third-party AI services</li>
                            <li>Understand that AI-generated images are derived works based on your photos</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">4.2 Content Restrictions</h3>
                        <p className="text-gray-300 leading-relaxed">You agree NOT to upload content that:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Contains nudity or sexually explicit material</li>
                            <li>Depicts minors</li>
                            <li>Violates intellectual property rights</li>
                            <li>Is harmful, abusive, or harassing</li>
                            <li>Contains malware or malicious code</li>
                            <li>Violates any applicable laws</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">4.3 Content Ownership</h3>
                        <p className="text-gray-300 leading-relaxed">
                            You retain ownership of your original photos. AI-generated try-on images are created for your personal use. We do not claim ownership of user-generated content but require a license to provide our services.
                        </p>
                    </section>

                    {/* AI Services */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">5. AI Services and Limitations</h2>

                        <h3 className="text-xl text-accent mt-6">5.1 AI-Generated Content</h3>
                        <p className="text-gray-300 leading-relaxed">You understand and acknowledge that:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>AI-generated try-on images are approximations and may not be perfectly accurate</li>
                            <li>Virtual try-on results should not replace physical try-ons for fit determination</li>
                            <li>AI stylist recommendations are suggestions, not professional fashion advice</li>
                            <li>AI processing may occasionally produce unexpected or imperfect results</li>
                        </ul>

                        <h3 className="text-xl text-accent mt-6">5.2 Third-Party AI Providers</h3>
                        <p className="text-gray-300 leading-relaxed">
                            Our Service utilizes third-party AI technologies including Google Gemini and Runway ML. These providers have their own terms of service and acceptable use policies that apply to content processed through their systems.
                        </p>

                        <h3 className="text-xl text-accent mt-6">5.3 Service Availability</h3>
                        <p className="text-gray-300 leading-relaxed">
                            AI services may be subject to rate limits, processing delays, or temporary unavailability. We do not guarantee uninterrupted access to AI features.
                        </p>
                    </section>

                    {/* Acceptable Use */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">6. Acceptable Use Policy</h2>
                        <p className="text-gray-300 leading-relaxed">You agree not to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Use the Service for any illegal purpose</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the Service</li>
                            <li>Scrape, copy, or harvest data from the Service</li>
                            <li>Use automated tools without permission</li>
                            <li>Impersonate others or misrepresent your identity</li>
                            <li>Violate the rights of others</li>
                            <li>Use the Service to generate harmful or misleading content</li>
                            <li>Resell or redistribute AI-generated content commercially without permission</li>
                        </ul>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">7. Intellectual Property</h2>
                        <p className="text-gray-300 leading-relaxed">
                            The Service, including its original content, features, and functionality, is owned by ScootPie and protected by international copyright, trademark, and other intellectual property laws.
                        </p>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            The ScootPie name, logo, and all related names, logos, and slogans are trademarks of ScootPie. You may not use these marks without our prior written permission.
                        </p>
                    </section>

                    {/* Third-Party Links */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">8. Third-Party Links and Services</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Our Service may contain links to third-party websites, including e-commerce platforms for purchasing clothing. We are not responsible for the content, privacy policies, or practices of third-party sites. Purchasing decisions and transactions with third parties are at your own risk.
                        </p>
                    </section>

                    {/* Disclaimers */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">9. Disclaimers</h2>
                        <div className="bg-zinc-900/50 border border-orange-500/20 rounded-lg p-4 mt-4">
                            <p className="text-gray-300 leading-relaxed">
                                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
                            </p>
                            <p className="text-gray-300 leading-relaxed mt-4">
                                VIRTUAL TRY-ON RESULTS ARE APPROXIMATIONS. WE DO NOT GUARANTEE THAT CLOTHING WILL FIT OR APPEAR AS SHOWN IN AI-GENERATED IMAGES. ALWAYS REFER TO RETAILER SIZE GUIDES AND RETURN POLICIES.
                            </p>
                        </div>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">10. Limitation of Liability</h2>
                        <p className="text-gray-300 leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCOOTPIE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Loss of profits, data, or goodwill</li>
                            <li>Service interruption or computer damage</li>
                            <li>Purchasing decisions based on virtual try-on results</li>
                            <li>Any other losses arising from your use of the Service</li>
                        </ul>
                    </section>

                    {/* Indemnification */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">11. Indemnification</h2>
                        <p className="text-gray-300 leading-relaxed">
                            You agree to defend, indemnify, and hold harmless ScootPie and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any rights of another.
                        </p>
                    </section>

                    {/* Termination */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">12. Termination</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
                        </p>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            You may delete your account at any time through the Account Settings. Upon deletion, your data will be removed in accordance with our Privacy Policy.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">13. Governing Law</h2>
                        <p className="text-gray-300 leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ScootPie operates, without regard to its conflict of law provisions.
                        </p>
                    </section>

                    {/* Changes */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">14. Changes to Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page. Your continued use of the Service after changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    {/* Severability */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">15. Severability</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-serif text-white border-b border-white/10 pb-2">16. Contact Us</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If you have questions about these Terms, please contact us at:
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
