"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
                <div className="aspect-video rounded-lg overflow-hidden bg-background/50 relative">
                    <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />
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

                          <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-background">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-auto object-cover"
                            />
                          </div>

                          <div className="prose prose-invert max-w-none text-text-secondary">
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                              {item.fullDescription}
                            </p>
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
