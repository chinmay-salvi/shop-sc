import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Shield, Eye, EyeOff, Lock, KeyRound, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, Download, LogOut,
} from "lucide-react";
import {
  verifyProofAndCreateSession, backupIdentityWithPassword,
  recoverIdentityWithPassword, isEnrolled, USE_JWT_ZK_LOGIN, loginWithJwtZk,
  enrollWithEmail, enrollWithGoogle,
} from "../../lib/zkp";
import { useAuth } from "../components/AuthContext";

type Step = "welcome" | "enroll" | "verify" | "recover";
type StatusType = "idle" | "loading" | "success" | "error";
interface StatusMsg { type: StatusType; text: string; }

const ZK_STEPS = [
  "Fetching group root…",
  "Deriving identity commitment…",
  "Building Merkle witness…",
  "Generating Groth16 proof…",
  "Verifying on backend…",
];

function ZkProofAnimation({ active }: { active: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    if (!active) { setStepIdx(0); return; }
    const iv = setInterval(() => setStepIdx((i) => (i < ZK_STEPS.length - 1 ? i + 1 : i)), 1400);
    return () => clearInterval(iv);
  }, [active]);
  if (!active) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="mt-4 rounded-xl border border-red-100 bg-red-50/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
        <span className="text-sm font-semibold text-red-700">Generating ZK Proof</span>
      </div>
      <div className="space-y-1.5">
        {ZK_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              i < stepIdx ? "bg-green-500" : i === stepIdx ? "bg-red-500 animate-pulse" : "bg-gray-200"
            }`}>
              {i < stepIdx && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <span className={`text-xs ${i < stepIdx ? "text-green-700 line-through opacity-60" : i === stepIdx ? "text-red-700 font-medium" : "text-gray-400"}`}>{step}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatusBanner({ status }: { status: StatusMsg }) {
  if (status.type === "idle") return null;
  const colors = { loading: "bg-blue-50 border-blue-200 text-blue-700", success: "bg-green-50 border-green-200 text-green-700", error: "bg-red-50 border-red-200 text-red-700" };
  const icons = { loading: <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />, success: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />, error: <AlertCircle className="w-4 h-4 flex-shrink-0" /> };
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm mt-3 ${colors[status.type]}`}>
      {icons[status.type]}<span>{status.text}</span>
    </motion.div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { refresh, hasSession, logout } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [devEmail, setDevEmail] = useState("");
  const [backupPwd, setBackupPwd] = useState("");
  const [recoverPwd, setRecoverPwd] = useState("");
  const [showBackupPwd, setShowBackupPwd] = useState(false);
  const [showRecoverPwd, setShowRecoverPwd] = useState(false);
  const [status, setStatus] = useState<StatusMsg>({ type: "idle", text: "" });
  const [isProving, setIsProving] = useState(false);

  // If already enrolled but no session, jump straight to verify
  useEffect(() => {
    if (!hasSession && isEnrolled()) setStep("verify");
  }, [hasSession]);

  const resetStatus = () => setStatus({ type: "idle", text: "" });

  // ── Dev email enroll ──
  const handleDevEnroll = async () => {
    if (!devEmail.trim()) { setStatus({ type: "error", text: "Enter a @usc.edu email." }); return; }
    try {
      setStatus({ type: "loading", text: "Creating Semaphore identity…" });
      await enrollWithEmail(devEmail.trim());
      setStatus({ type: "success", text: "Enrolled! Now verify your proof." });
      refresh();
      setTimeout(() => setStep("verify"), 700);
    } catch (e) {
      setStatus({ type: "error", text: `Enrollment failed: ${(e as Error).message}` });
    }
  };

  // ── Verify (generate ZK proof) ──
  const handleVerify = async () => {
    try {
      setStatus({ type: "loading", text: "Generating proof (5–10s)…" });
      setIsProving(true);
      await verifyProofAndCreateSession();
      setStatus({ type: "success", text: "Session created! Redirecting…" });
      refresh();
      setTimeout(() => navigate("/marketplace"), 900);
    } catch (e) {
      setStatus({ type: "error", text: `Verification failed: ${(e as Error).message}` });
    } finally {
      setIsProving(false);
    }
  };

  // ── Google sign-in ──
  const handleGoogleCredential = async (idToken: string) => {
    try {
      if (USE_JWT_ZK_LOGIN) {
        setStatus({ type: "loading", text: "Generating ZK proof…" });
        setIsProving(true);
        await loginWithJwtZk(idToken);
        setStatus({ type: "success", text: "Verified! Redirecting…" });
        refresh();
        setTimeout(() => navigate("/marketplace"), 800);
      } else {
        setStatus({ type: "loading", text: "Enrolling with Google…" });
        await enrollWithGoogle(idToken);
        setStatus({ type: "success", text: "Enrolled! Now verify your proof." });
        refresh();
        setStep("verify");
      }
    } catch (e) {
      setStatus({ type: "error", text: `Sign-in failed: ${(e as Error).message}` });
    } finally {
      setIsProving(false);
    }
  };

  // ── Backup ──
  const handleBackup = async () => {
    if (!backupPwd.trim()) { setStatus({ type: "error", text: "Enter a recovery password." }); return; }
    try {
      setStatus({ type: "loading", text: "Encrypting identity…" });
      await backupIdentityWithPassword(backupPwd.trim());
      setStatus({ type: "success", text: "Identity backed up! Remember your password." });
      setBackupPwd("");
    } catch (e) {
      setStatus({ type: "error", text: `Backup failed: ${(e as Error).message}` });
    }
  };

  // ── Recover ──
  const handleRecover = async () => {
    if (!recoverPwd.trim()) { setStatus({ type: "error", text: "Enter your recovery password." }); return; }
    try {
      setStatus({ type: "loading", text: "Recovering identity…" });
      await recoverIdentityWithPassword(recoverPwd.trim());
      setStatus({ type: "success", text: "Identity recovered! Now verify your proof." });
      refresh();
      setRecoverPwd("");
      setTimeout(() => setStep("verify"), 700);
    } catch (e) {
      setStatus({ type: "error", text: `Recovery failed: ${(e as Error).message}` });
    }
  };

  const handleLogout = () => { logout(); setStep("welcome"); resetStatus(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">ShopSC</span>
            <Badge variant="outline" className="ml-1 text-xs border-red-200 text-red-700">USC Only</Badge>
          </div>
          {hasSession && (
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Privacy pills */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 justify-center mb-6">
            {["Zero PII stored", "ZK verified identity", "@usc.edu only"].map((label) => (
              <span key={label} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5">
                <CheckCircle2 className="w-3 h-3" />{label}
              </span>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── WELCOME ── */}
            {step === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-0 shadow-xl shadow-gray-200/60">
                  <CardContent className="pt-8 pb-8 px-8">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
                        <Lock className="w-8 h-8 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access ShopSC</h1>
                      <p className="text-gray-500 text-sm leading-relaxed">Verify your USC enrollment anonymously using zero-knowledge proofs. Your email is never shared.</p>
                    </div>
                    <div className="space-y-3">
                      {/* Google (placeholder — wire to @react-oauth/google in prod) */}
                      <button
                        onClick={() => { setStep("enroll"); resetStatus(); }}
                        className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                          <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                        </svg>
                        Continue with Google (@usc.edu)
                      </button>
                      <div className="relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <Button variant="outline" className="w-full gap-2" onClick={() => { setStep("enroll"); resetStatus(); }}>
                        <KeyRound className="w-4 h-4" />Dev email enroll
                      </Button>
                      <Button variant="ghost" className="w-full text-sm text-gray-500 gap-2" onClick={() => { setStep("recover"); resetStatus(); }}>
                        <RefreshCw className="w-4 h-4" />Recover existing identity
                      </Button>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">How it works</p>
                      <div className="space-y-2">
                        {["Sign in with your @usc.edu Google account", "A ZK proof is generated entirely in your browser", "Backend verifies the proof — your email is never sent"].map((text, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-gray-500">
                            <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            {text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── ENROLL ── */}
            {step === "enroll" && (
              <motion.div key="enroll" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-0 shadow-xl shadow-gray-200/60">
                  <CardContent className="pt-8 pb-8 px-8">
                    <button onClick={() => { setStep("welcome"); resetStatus(); }} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Back</button>
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Dev Enrollment</h2>
                      <p className="text-sm text-gray-500">Use a @usc.edu email to generate your anonymous identity. Your email is verified but never stored.</p>
                    </div>
                    <div className="space-y-3">
                      <Input type="email" placeholder="you@usc.edu" value={devEmail}
                        onChange={(e) => setDevEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleDevEnroll()}
                        className="border-gray-200 focus:border-red-400" />
                      <Button onClick={handleDevEnroll} disabled={status.type === "loading"} className="w-full bg-red-600 hover:bg-red-700 gap-2">
                        {status.type === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" />Enrolling…</> : <><Shield className="w-4 h-4" />Enroll Anonymously</>}
                      </Button>
                    </div>
                    <StatusBanner status={status} />
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400">Already enrolled?{" "}
                        <button onClick={() => { setStep("recover"); resetStatus(); }} className="text-red-600 hover:underline">Recover identity</button>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── VERIFY ── */}
            {step === "verify" && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-0 shadow-xl shadow-gray-200/60">
                  <CardContent className="pt-8 pb-8 px-8">
                    <div className="text-center mb-6">
                      <div className="w-14 h-14 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-7 h-7 text-green-500" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Identity Ready</h2>
                      <p className="text-sm text-gray-500">Generate your zero-knowledge proof to get a session. This runs entirely in your browser.</p>
                    </div>
                    <Button onClick={handleVerify} disabled={isProving} className="w-full bg-red-600 hover:bg-red-700 gap-2 mb-3" size="lg">
                      {isProving ? <><Loader2 className="w-4 h-4 animate-spin" />Proving membership…</> : <><KeyRound className="w-4 h-4" />Verify & Get Session</>}
                    </Button>
                    <AnimatePresence><ZkProofAnimation active={isProving} /></AnimatePresence>
                    <StatusBanner status={status} />

                    {hasSession && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Session active</p>
                        <button onClick={handleLogout} className="mt-1.5 text-xs text-red-600 hover:underline flex items-center gap-1">
                          <LogOut className="w-3 h-3" />Sign out
                        </button>
                      </div>
                    )}

                    {/* Backup section */}
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">Back up your identity</p>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Save so you can recover from another device.</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input type={showBackupPwd ? "text" : "password"} placeholder="Recovery password"
                            value={backupPwd} onChange={(e) => setBackupPwd(e.target.value)}
                            className="pr-8 text-sm border-gray-200" />
                          <button onClick={() => setShowBackupPwd(!showBackupPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                            {showBackupPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <Button onClick={handleBackup} variant="outline" size="sm" className="shrink-0">Back up</Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button onClick={() => { setStep("welcome"); resetStatus(); }} className="text-xs text-gray-400 hover:text-gray-600">← Start over</button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── RECOVER ── */}
            {step === "recover" && (
              <motion.div key="recover" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-0 shadow-xl shadow-gray-200/60">
                  <CardContent className="pt-8 pb-8 px-8">
                    <button onClick={() => { setStep("welcome"); resetStatus(); }} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Back</button>
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                        <RefreshCw className="w-6 h-6 text-blue-500" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Recover Identity</h2>
                      <p className="text-sm text-gray-500">Restore your anonymous identity using your recovery password.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input type={showRecoverPwd ? "text" : "password"} placeholder="Recovery password"
                          value={recoverPwd} onChange={(e) => setRecoverPwd(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRecover()}
                          className="pr-8 border-gray-200 focus:border-blue-400" />
                        <button onClick={() => setShowRecoverPwd(!showRecoverPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showRecoverPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button onClick={handleRecover} disabled={status.type === "loading"} className="w-full gap-2">
                        {status.type === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" />Recovering…</> : <><RefreshCw className="w-4 h-4" />Recover Identity</>}
                      </Button>
                    </div>
                    <StatusBanner status={status} />
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400">No backup?{" "}
                        <button onClick={() => { setStep("enroll"); resetStatus(); }} className="text-red-600 hover:underline">Enroll again</button>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            Your email is verified in-circuit and never stored.<br />All proofs run locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
