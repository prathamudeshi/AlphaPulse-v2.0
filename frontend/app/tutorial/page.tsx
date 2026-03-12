"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { helpItems } from "./data";

export default function TutorialPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background text-text-primary p-6 md:p-12 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Help Center
          </h1>
          <p className="text-xl text-text-secondary">
            Master the platform with our detailed guides. Click on any card to learn more.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpItems.map((item) => (
            <motion.div
              layoutId={item.id}
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="bg-surface border border-border rounded-2xl p-6 cursor-pointer hover:bg-surface-hover transition-colors group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className={`aspect-video rounded-xl overflow-hidden relative bg-gradient-to-br ${item.gradient} flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500`}>
                  {item.image ? (
                    <>
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md p-1.5 rounded-lg text-white/80">
                        <item.icon className="w-4 h-4" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-black/10" />
                      <item.icon className="w-16 h-16 text-white/90 drop-shadow-lg" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </>
                  )}
                </div>
                <div>
                  <motion.h2 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </motion.h2>
                  <motion.p className="text-text-secondary text-sm line-clamp-2">
                    {item.shortDescription}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selectedId && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <div className="fixed inset-0 grid place-items-center z-50 pointer-events-none p-4">
                <motion.div
                  layoutId={selectedId}
                  className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl scrollbar-hide"
                >
                  {(() => {
                    const item = helpItems.find((i) => i.id === selectedId)!;
                    return (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(null);
                          }}
                          className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 backdrop-blur-md"
                        >
                          <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 md:p-8 space-y-6">
                          <div className="space-y-2">
                            <motion.h2 className="text-3xl font-bold text-text-primary">
                              {item.title}
                            </motion.h2>
                            <motion.p className="text-lg text-text-secondary">
                              {item.shortDescription}
                            </motion.p>
                          </div>

                          <div className={`rounded-xl overflow-hidden border border-border shadow-lg aspect-video relative bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                            {item.image ? (
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover object-top" />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-black/10" />
                                <item.icon className="w-32 h-32 text-white/90 drop-shadow-2xl" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                              </>
                            )}
                          </div>

                          <div className="prose prose-invert max-w-none text-text-secondary">
                            <ReactMarkdown
                              components={{
                                strong: ({ node, ...props }: any) => <span className="font-bold text-text-primary" {...props} />,
                                ul: ({ node, ...props }: any) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                                li: ({ node, ...props }: any) => <li className="marker:text-primary" {...props} />,
                                p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                              }}
                            >
                              {item.fullDescription as string}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
