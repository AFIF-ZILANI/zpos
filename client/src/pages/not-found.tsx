import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center px-4">
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            box-shadow: 0 0 0 0 rgba(31, 41, 55, 0.1);
          }
          100% {
            box-shadow: 0 0 0 20px rgba(31, 41, 55, 0);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-fade-in-scale {
          animation: fadeInScale 0.6s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      <div className="w-full max-w-2xl">
        {/* Main Container */}
        <div
          className="animate-fade-in-scale"
          style={{ animationDuration: "0.8s" }}
        >
          {/* 404 Number with Animation */}
          <div className="mb-8 relative flex justify-center">
            <div className="relative">
              {/* Animated background circle */}
              <div className="absolute inset-0 rounded-full bg-slate-900 blur-3xl opacity-5 animate-shimmer" />

              {/* Large 404 */}
              <div
                className="text-9xl md:text-[150px] font-black text-slate-900 tracking-tighter"
                style={{
                  animationDelay: "0.1s",
                }}
              >
                <span
                  className="inline-block animate-float"
                  style={{ animationDelay: "0s" }}
                >
                  4
                </span>
                <span
                  className="inline-block animate-float"
                  style={{ animationDelay: "0.1s" }}
                >
                  0
                </span>
                <span
                  className="inline-block animate-float"
                  style={{ animationDelay: "0.2s" }}
                >
                  4
                </span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div
            className="animate-slide-up text-center space-y-4"
            style={{ animationDelay: "0.2s" }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
              It looks like this page has wandered off the rack. Let&apos;s get
              you back to your POS dashboard.
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/"
              className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-slate-900 rounded-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-950 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Dashboard
              </span>
            </Link>

            <Link
              href="/"
              className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-slate-900 bg-slate-100 rounded-full overflow-hidden transition-all duration-300 hover:bg-slate-200 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2.149-2.149A4 4 0 015.858 2H18.142a4 4 0 013.709 7.851L21 12M9 7h0m6 0h0"
                  />
                </svg>
                Help & Support
              </span>
            </Link>
          </div>

          {/* Footer Details */}
          <div
            className="mt-16 pt-8 border-t border-slate-200 text-center"
            style={{ animationDelay: "0.4s" }}
          >
            <p className="text-sm text-slate-500 mb-3">
              zPOS Retail Management System
            </p>
            <div className="flex justify-center gap-6 text-xs text-slate-400">
              <span>Error Code: 404</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Page not found</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
