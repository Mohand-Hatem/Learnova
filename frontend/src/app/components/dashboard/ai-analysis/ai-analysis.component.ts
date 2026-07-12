import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { StatCardComponent } from '../overview/components/stat-card/stat-card';
import { AiMonitoringService } from '../../../services/ai-monitoring.service';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule, StatCardComponent],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './ai-analysis.component.html',
})
export class AiAnalysisComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly aiService = inject(AiMonitoringService);

  readonly statCards = this.aiService.statCards;
  readonly companies = this.aiService.topUsers;
  readonly loading = this.aiService.loading;
  readonly loadError = this.aiService.loadError;
  readonly hasStats = this.aiService.hasStats;
  readonly hasTopUsers = this.aiService.hasTopUsers;
  readonly hasMonthly = this.aiService.hasMonthly;
  readonly hasTokenBreakdown = this.aiService.hasTokenBreakdown;

  readonly tokenBreakdownChartOption = computed(() => {
    const dark = this.themeService.isDark();
    const textColor = dark ? '#cbd5e1' : '#475569';
    const data = this.aiService.tokenBreakdown();

    return {
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'item',
        backgroundColor: dark ? '#1e293b' : '#ffffff',
        borderColor: dark ? '#334155' : '#e2e8f0',
        textStyle: { color: dark ? '#f8fafc' : '#0f172a' },
        padding: [12, 16],
        borderRadius: 8,
        extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'
      },
      legend: {
        bottom: '0%',
        textStyle: { color: textColor, fontSize: 12, fontWeight: 500 },
        icon: 'circle',
        itemGap: 24,
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: dark ? '#0f172a' : '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: [
            { value: data.embedding, name: 'Embedding', itemStyle: { color: '#8b5cf6' } }, // Violet
            { value: data.prompt, name: 'Prompt', itemStyle: { color: '#0ea5e9' } },    // Sky
            { value: data.completion, name: 'Completion', itemStyle: { color: '#10b981' } }, // Emerald
          ],
        },
      ],
    };
  });

  readonly tokenChartOption = computed(() => {
    const dark = this.themeService.isDark();
    const data = this.aiService.monthly();
    const textColor = dark ? '#94a3b8' : '#64748b';
    const gridLineColor = dark ? '#1e293b' : '#f1f5f9';

    return {
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } },
        backgroundColor: dark ? '#1e293b' : '#ffffff',
        borderColor: dark ? '#334155' : '#e2e8f0',
        padding: 0,
        borderRadius: 12,
        extraCssText: 'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid ' + (dark ? '#334155' : '#e2e8f0') + '; overflow: hidden;',
        formatter: (params: any[]) => {
          const dataIndex = params[0].dataIndex;
          const rTime = data.avgResponseTimeMs[dataIndex];
          const totalTokens = data.totalTokens[dataIndex];
          
          let html = `<div class="p-4 min-w-[240px]">`;
          html += `<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">${params[0].axisValue} Analytics</h3>`;
          html += `<div class="flex flex-col gap-3">`;
          
          params.forEach((p) => {
            let color = p.color;
            if (p.color && p.color.colorStops) {
              color = p.color.colorStops[0].color;
            } else if (p.color && p.color.image) {
               // fallback for complex colors
               color = '#8b5cf6';
            }
            const dot = `<span class="inline-block w-2.5 h-2.5 rounded-full mr-2.5 shadow-sm" style="background:${color}"></span>`;
            const val = p.value >= 1000 ? (p.value/1000).toFixed(1) + 'k' : p.value;
            html += `<div class="flex justify-between items-center text-sm font-medium">
                       <div class="flex items-center text-slate-600 dark:text-slate-300">${dot}${p.seriesName}</div>
                       <div class="text-slate-900 dark:text-white font-bold">${val}</div>
                     </div>`;
          });
          
          html += `<div class="mt-1 pt-3 border-t border-slate-100 dark:border-slate-700/50"></div>`;
          
          html += `<div class="flex justify-between items-center text-[13px] text-slate-500 dark:text-slate-400">
                     <span class="flex items-center gap-1.5">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                       Total Tokens
                     </span>
                     <span class="font-bold text-slate-700 dark:text-slate-200">${totalTokens >= 1000 ? (totalTokens/1000).toFixed(1) + 'k' : totalTokens}</span>
                   </div>`;
                   
          html += `<div class="flex justify-between items-center text-[13px] text-slate-500 dark:text-slate-400 mt-2">
                     <span class="flex items-center gap-1.5">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                       Avg Response
                     </span>
                     <span class="font-bold text-rose-500">${Math.round(rTime)} ms</span>
                   </div>`;
                   
          html += `</div></div>`;
          return html;
        }
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: dark ? '#cbd5e1' : '#475569', fontSize: 12, fontWeight: 500 },
        icon: 'circle',
        itemGap: 20
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: data.labels,
        axisLabel: { color: textColor, margin: 16, fontSize: 11, fontWeight: 500 },
        axisLine: { lineStyle: { color: gridLineColor } },
        axisTick: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: 'AI Calls',
          nameTextStyle: { color: textColor, padding: [0, 24, 0, 0], fontWeight: 500 },
          axisLabel: { color: textColor, fontSize: 11 },
          splitLine: { lineStyle: { color: gridLineColor, type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'Tokens',
          nameTextStyle: { color: textColor, padding: [0, 0, 0, 24], fontWeight: 500 },
          axisLabel: {
            color: textColor,
            fontSize: 11,
            formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)),
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'AI Calls',
          type: 'line',
          smooth: 0.4,
          data: data.aiCalls,
          symbolSize: 8,
          symbol: 'circle',
          itemStyle: { 
            color: '#8b5cf6', // Violet
            borderColor: dark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            shadowColor: 'rgba(139, 92, 246, 0.4)',
            shadowBlur: 8,
            shadowOffsetY: 4
          },
          lineStyle: { width: 3, color: '#8b5cf6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.0)' }
            ])
          }
        },
        {
          name: 'Embedding',
          type: 'bar',
          stack: 'Tokens',
          yAxisIndex: 1,
          barMaxWidth: 16,
          data: data.embeddingTokens,
          itemStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#c4b5fd' },
              { offset: 1, color: '#8b5cf6' }
            ]) 
          },
        },
        {
          name: 'Prompt',
          type: 'bar',
          stack: 'Tokens',
          yAxisIndex: 1,
          barMaxWidth: 16,
          data: data.promptTokens,
          itemStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#7dd3fc' },
              { offset: 1, color: '#0ea5e9' }
            ]) 
          },
        },
        {
          name: 'Completion',
          type: 'bar',
          stack: 'Tokens',
          yAxisIndex: 1,
          barMaxWidth: 16,
          data: data.completionTokens,
          itemStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#6ee7b7' },
              { offset: 1, color: '#10b981' }
            ]),
            borderRadius: [6, 6, 0, 0] 
          },
        },
      ],
    };
  });

  readonly performanceChartOption = computed(() => {
    const dark = this.themeService.isDark();
    const data = this.aiService.monthly();
    const textColor = dark ? '#94a3b8' : '#64748b';
    const gridLineColor = dark ? '#1e293b' : '#f1f5f9';

    return {
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: dark ? '#334155' : '#e2e8f0', type: 'dashed' } },
        backgroundColor: dark ? '#1e293b' : '#ffffff',
        borderColor: dark ? '#334155' : '#e2e8f0',
        padding: 0,
        borderRadius: 12,
        extraCssText: 'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid ' + (dark ? '#334155' : '#e2e8f0') + '; overflow: hidden;',
        formatter: (params: any[]) => {
          let html = `<div class="p-4 min-w-[200px]">`;
          html += `<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">${params[0].axisValue} Performance</h3>`;
          html += `<div class="flex flex-col gap-3">`;
          
          params.forEach((p) => {
            const isResponseTime = p.seriesName === 'Avg Response';
            const val = isResponseTime ? Math.round(p.value) + ' ms' : p.value.toFixed(1) + '%';
            const color = p.color;
            const dot = `<span class="inline-block w-2.5 h-2.5 rounded-full mr-2.5 shadow-sm" style="background:${color}"></span>`;
            
            html += `<div class="flex justify-between items-center text-sm font-medium">
                       <div class="flex items-center text-slate-600 dark:text-slate-300">${dot}${p.seriesName}</div>
                       <div class="text-slate-900 dark:text-white font-bold">${val}</div>
                     </div>`;
          });
                   
          html += `</div></div>`;
          return html;
        }
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: dark ? '#cbd5e1' : '#475569', fontSize: 12, fontWeight: 500 },
        icon: 'circle',
        itemGap: 20
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.labels,
        axisLabel: { color: textColor, margin: 16, fontSize: 11, fontWeight: 500 },
        axisLine: { lineStyle: { color: gridLineColor } },
        axisTick: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Response Time',
          nameTextStyle: { color: textColor, padding: [0, 24, 0, 0], fontWeight: 500 },
          axisLabel: { color: textColor, fontSize: 11, formatter: '{value} ms' },
          splitLine: { lineStyle: { color: gridLineColor, type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'Success Rate',
          min: 0,
          max: 100,
          nameTextStyle: { color: textColor, padding: [0, 0, 0, 24], fontWeight: 500 },
          axisLabel: { color: textColor, fontSize: 11, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Avg Response',
          type: 'line',
          smooth: 0.4,
          data: data.avgResponseTimeMs,
          symbolSize: 8,
          symbol: 'circle',
          itemStyle: { 
            color: '#f43f5e', // Rose
            borderColor: dark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            shadowColor: 'rgba(244, 63, 94, 0.4)',
            shadowBlur: 8,
            shadowOffsetY: 4
          },
          lineStyle: { width: 3, color: '#f43f5e' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244, 63, 94, 0.3)' },
              { offset: 1, color: 'rgba(244, 63, 94, 0.0)' }
            ])
          }
        },
        {
          name: 'Success Rate',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.4,
          data: data.successRate,
          symbolSize: 8,
          symbol: 'circle',
          itemStyle: { 
            color: '#10b981', // Emerald
            borderColor: dark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            shadowColor: 'rgba(16, 185, 129, 0.4)',
            shadowBlur: 8,
            shadowOffsetY: 4
          },
          lineStyle: { width: 3, color: '#10b981', type: 'dashed' },
        },
      ],
    };
  });

  ngOnInit(): void {
    this.aiService.load();
  }
}