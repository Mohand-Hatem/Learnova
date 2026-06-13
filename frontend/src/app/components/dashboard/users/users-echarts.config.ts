import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  LegendComponent,
  CanvasRenderer,
]);

/** Global tree-shaken ECharts registration used across the whole app. */
export const USERS_ECHARTS_PROVIDERS = [
  provideEchartsCore({ echarts: () => Promise.resolve(echarts) }),
];
