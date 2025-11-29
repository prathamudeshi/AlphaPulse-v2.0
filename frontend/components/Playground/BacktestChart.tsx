"use client";

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  Legend
} from 'recharts';

interface BacktestChartProps {
  data: any[];
  trades: any[];
  strategy: string;
}

const BacktestChart: React.FC<BacktestChartProps> = ({ data, trades, strategy }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary bg-surface rounded-lg border border-border">
        No data to display
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full bg-surface p-4 rounded-lg border border-border" id="tutorial-backtest-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444746" />
          <XAxis 
            dataKey="date" 
            stroke="#c4c7c5" 
            tick={{ fill: '#c4c7c5' }}
            tickFormatter={(val) => new Date(val).toLocaleDateString()}
          />
          <YAxis 
            yAxisId="left"
            stroke="#c4c7c5" 
            tick={{ fill: '#c4c7c5' }}
            domain={['auto', 'auto']}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#10B981" 
            tick={{ fill: '#10B981' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e1f20', borderColor: '#444746', color: '#e3e3e3' }}
            itemStyle={{ color: '#e3e3e3' }}
            labelStyle={{ color: '#c4c7c5' }}
          />
          <Legend />
          
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="price" 
            stroke="#a8c7fa" 
            dot={false} 
            name="Price"
          />
          
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="equity" 
            stroke="#10B981" 
            dot={false} 
            name="Equity"
          />

          {trades.map((trade, index) => (
            <ReferenceDot
              key={index}
              yAxisId="left"
              x={trade.date}
              y={trade.price}
              r={5}
              fill={trade.type === 'BUY' ? '#10B981' : '#EF4444'}
              stroke="none"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestChart;
