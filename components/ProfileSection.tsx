
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { 
    UserCircleIcon, 
    KeyIcon, 
    ClockIcon, 
    TrashIcon, 
    AcademicCapIcon, 
    DocumentTextIcon, 
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    BoltIcon,
    ArrowPathIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import { HistoryService, HistoryItem } from '../services/history';
import { GeminiService, UsageStats } from '../services/gemini';

export const ProfileSection: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usage, setUsage] = useState<UsageStats>(GeminiService.getUsage());
  const [apiKeyStatus, setApiKeyStatus] = useState<boolean>(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const [modelTier, setModelTier] = useState<'flash' | 'pro'>('flash');

  useEffect(() => {
    setHistory(HistoryService.get());
    checkKeyStatus();
    setModelTier(GeminiService.getModelTier());
  }, []);

  const checkKeyStatus = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      try {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setApiKeyStatus(hasKey);
      } catch (e) {
        console.error("Error checking API key status", e);
      }
    }
  };

  const handleManageKey = async () => {
    setLoadingKey(true);
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
      try {
        await win.aistudio.openSelectKey();
        setTimeout(checkKeyStatus, 1000);
      } catch (e) {
        console.error("Error opening key selector", e);
      }
    }
    setLoadingKey(false);
  };

  const clearHistory = () => {
    if (confirm("هل أنت متأكد من مسح سجل النشاطات؟")) {
        HistoryService.clear();
        setHistory([]);
    }
  };

  const handleResetUsage = () => {
    if (confirm("هل تريد إعادة تعيين عداد الاستهلاك؟")) {
        GeminiService.resetUsage();
        setUsage(GeminiService.getUsage());
    }
  };

  const handleModelChange = (tier: 'flash' | 'pro') => {
    GeminiService.setModelTier(tier);
    setModelTier(tier);
  };

  // Stats for the top row
  const quizCount = history.filter(h => h.type === 'quiz').length;
  const summaryCount = history.filter(h => h.type === 'summary').length;

  return (
    <div className="w-full h-full p-6 md:p-10 overflow-y-auto font-cairo bg-zinc-950" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <UserCircleIcon className="w-10 h-10 text-blue-500" />
          الملف الشخصي والإحصائيات
        </h2>
        <div className="flex gap-2">
            <button 
                onClick={() => setUsage(GeminiService.getUsage())}
                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"
                title="تحديث البيانات"
            >
                <ArrowPathIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: API Consumption & Stats */}
        <div className="lg:col-span-1 space-y-8 animate-in slide-in-from-right-8 duration-700">
            
            {/* Model Capability Settings */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                    <CpuChipIcon className="w-5 h-5 text-purple-500" />
                    قدرات الذكاء الاصطناعي
                 </h3>
                 
                 <div className="bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 flex relative overflow-hidden mb-4">
                    <button 
                      onClick={() => handleModelChange('flash')}
                      className={`flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-bold rounded-lg transition-all z-10 ${modelTier === 'flash' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Standard (Flash)
                    </button>
                    <button 
                      onClick={() => handleModelChange('pro')}
                      className={`flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-bold rounded-lg transition-all z-10 ${modelTier === 'pro' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Advanced (Pro)
                    </button>
                 </div>

                 <div className="text-[11px] leading-relaxed text-zinc-400 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    {modelTier === 'flash' ? (
                        <>
                            <strong className="text-blue-400 block mb-1">Standard (Gemini 3 Flash):</strong>
                            نموذج سريع وفعال جداً من حيث التكلفة. مثالي للمهام اليومية، التلخيص السريع، والمحادثات العادية.
                        </>
                    ) : (
                        <>
                            <strong className="text-purple-400 block mb-1">Advanced (Gemini 3 Pro):</strong>
                            نموذج فائق الذكاء للمهام المعقدة والاستنتاج المنطقي العميق.
                            <br/><span className="text-yellow-500 mt-1 block">⚠️ تنبيه: أبطأ قليلاً ويستهلك رصيداً أكبر.</span>
                        </>
                    )}
                 </div>
            </div>

            {/* API Consumption Card */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 rounded-[32px] shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -mr-16 -mt-16"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-blue-500" />
                        استهلاك Gemini API
                    </h3>
                    <button onClick={handleResetUsage} className="text-[10px] text-zinc-500 hover:text-red-400 font-bold uppercase tracking-wider">Reset</button>
                </div>
                
                <div className="space-y-5 relative z-10">
                    <UsageMeter label="تفريغ الصوت (Transcriptions)" current={usage.transcriptions} limit={100} icon={BoltIcon} />
                    <UsageMeter label="التلخيص (Summaries)" current={usage.summaries} limit={200} icon={DocumentTextIcon} />
                    <UsageMeter label="المحادثات (Assistant Chats)" current={usage.chats} limit={1000} icon={ChatBubbleLeftRightIcon} />
                    <UsageMeter label="توليد الاختبارات (Quizzes)" current={usage.quizzes} limit={50} icon={AcademicCapIcon} />
                    <UsageMeter label="توليد الصور (Flash Images)" current={usage.images} limit={100} icon={BoltIcon} />
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800/50 text-[10px] text-zinc-500 font-medium leading-relaxed">
                    * الحدود المقدرة تعتمد على استهلاكك الشخصي وسياسة Google AI Studio. 
                    في حال الوصول للحد الأقصى، قد تواجه أخطاء 429 (Too Many Requests).
                </div>
            </div>

            {/* API Key Settings */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/5 blur-[50px] -ml-16 -mt-16"></div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                    <KeyIcon className="w-5 h-5 text-yellow-500" />
                    إدارة مفتاح الـ API
                </h3>
                <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-6 relative z-10">
                    <span className="text-xs font-mono text-zinc-500">Service Connectivity</span>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${apiKeyStatus ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {apiKeyStatus ? 'متصل' : 'غير متصل'}
                    </span>
                </div>
                <button 
                    onClick={handleManageKey}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all border border-zinc-700 hover:border-zinc-500 flex items-center justify-center gap-2 relative z-10"
                >
                    {loadingKey ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "تغيير المفتاح / تسجيل الدخول"}
                </button>
            </div>
        </div>

        {/* Right Column: User Stats & History */}
        <div className="lg:col-span-2 space-y-8 animate-in slide-in-from-left-8 duration-700 delay-100">
            
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="اختبارات مجتازة" value={quizCount} icon={AcademicCapIcon} color="bg-blue-500/10 text-blue-500" />
                <StatCard label="محاضرات ملخصة" value={summaryCount} icon={DocumentTextIcon} color="bg-green-500/10 text-green-400" />
                <StatCard label="نقاط الخبرة XP" value={quizCount * 25 + summaryCount * 10} icon={BoltIcon} color="bg-purple-500/10 text-purple-400" />
            </div>

            {/* History Section */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-[40px] flex flex-col h-[520px] shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ClockIcon className="w-6 h-6 text-blue-500" />
                        سجل النشاطات الحديثة
                    </h3>
                    {history.length > 0 && (
                        <button onClick={clearHistory} className="text-xs text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-full transition-colors border border-red-500/20">
                            مسح السجل
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 opacity-40">
                            <ClockIcon className="w-20 h-20" />
                            <p className="text-lg font-medium">لا يوجد نشاط مسجل حتى الآن</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="group flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-800 rounded-3xl hover:border-zinc-600 transition-all hover:bg-zinc-900">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getTypeColor(item.type)}`}>
                                        {getTypeIcon(item.type)}
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-200 font-bold text-sm mb-0.5">{item.title}</h4>
                                        <p className="text-[10px] text-zinc-500 font-mono">
                                            {new Date(item.timestamp).toLocaleDateString('ar-SY', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 uppercase group-hover:text-zinc-400 transition-colors">
                                    {item.type}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const UsageMeter = ({ label, current, limit, icon: Icon }: { label: string, current: number, limit: number, icon: any }) => {
    const percentage = Math.min((current / limit) * 100, 100);
    const isWarning = percentage > 80;
    const isDanger = percentage === 100;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-bold">{label}</span>
                </div>
                <div className="font-mono">
                    <span className={isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'}>{current}</span>
                    <span className="text-zinc-600 mx-1">/</span>
                    <span className="text-zinc-600">{limit}</span>
                </div>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ${isDanger ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : isWarning ? 'bg-yellow-500' : 'bg-blue-600'}`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl flex flex-col items-center gap-3 hover:border-zinc-700 transition-colors shadow-lg">
        <div className={`p-3 rounded-2xl ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="text-center">
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{label}</div>
        </div>
    </div>
);

const getTypeColor = (type: string) => {
    switch(type) {
        case 'quiz': return 'bg-blue-500/10 text-blue-500';
        case 'summary': return 'bg-green-500/10 text-green-400';
        case 'chat': return 'bg-purple-500/10 text-purple-400';
        default: return 'bg-zinc-500/10 text-zinc-500';
    }
};

const getTypeIcon = (type: string) => {
    switch(type) {
        case 'quiz': return <AcademicCapIcon className="w-5 h-5" />;
        case 'summary': return <DocumentTextIcon className="w-5 h-5" />;
        case 'chat': return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
        default: return <ClockIcon className="w-5 h-5" />;
    }
};
