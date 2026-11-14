'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Info, 
  RotateCcw, 
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

interface GroqChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isRuleBased?: boolean;
  notice?: string;
}

export function GroqChatDrawer({ isOpen, onClose }: GroqChatDrawerProps) {
  const { currentBusiness, products, recommendations, purchaseOrders } = useInventory();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your **FlowCast Inventory Planning Assistant**.\n\nI can explain inventory formulas, analyze why certain items are at risk, review supplier lead-time constraints, or explain the Theory of Computation DFA state for any SKU in **${currentBusiness.name}**.\n\nHow can I help you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          businessContext: {
            businessName: currentBusiness.name,
            currency: currentBusiness.currency,
            currencySymbol: currentBusiness.currencySymbol,
            totalProducts: products.length,
            criticalCount: recommendations.filter(r => r.urgency === 'critical').length,
            openPOCount: purchaseOrders.filter(p => p.status === 'sent').length,
            products: products.map(p => ({
              sku: p.sku,
              name: p.name,
              currentStock: p.currentStock,
              reorderPoint: p.reorderPoint,
              leadTimeDays: p.leadTimeDays,
              unitCost: p.unitCost,
            })),
            recommendations: recommendations.map(r => ({
              productSku: r.productSku,
              productName: r.productName,
              supplierName: r.supplierName,
              urgency: r.urgency,
              dfaStateId: r.dfaStateId,
              currentStock: r.currentStock,
              daysOfStockRemaining: r.daysOfStockRemaining,
              leadTimeDays: r.leadTimeDays,
              suggestedQuantity: r.suggestedQuantity,
              estimatedCost: r.estimatedCost,
              orderDeadlineDate: r.orderDeadlineDate,
            })),
            purchaseOrders: purchaseOrders.map(po => ({
              poNumber: po.poNumber,
              supplierName: po.supplierName,
              status: po.status,
              totalAmount: po.totalAmount,
              expectedDeliveryDate: po.expectedDeliveryDate,
            })),
          }
        })
      });

      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Error from assistant: ${data.error}`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          isRuleBased: data.isRuleBasedFallback,
          notice: data.notice,
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Network error communicating with inventory service: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    `Why is ${products[0]?.sku || 'APX-HD-700'} at risk?`,
    'Which products need attention this week?',
    'Explain the safety stock formula in simple terms.',
    'What does DFA state Q3_CRITICAL mean?',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-xs animate-in slide-in-from-right duration-200">
      
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Inventory Copilot</h3>
            <p className="text-[10px] text-slate-400">Contextual Explanations & Risk Q&A</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-[11px] text-slate-300 whitespace-nowrap transition-all"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                isUser 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
              }`}>
                <div className="whitespace-pre-wrap text-xs">
                  {m.content}
                </div>

                {m.notice && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-400/90 flex items-start gap-1">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{m.notice}</span>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 p-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
            <span className="text-[11px]">Evaluating business inventory context...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about inventory, formulas, or risks..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
