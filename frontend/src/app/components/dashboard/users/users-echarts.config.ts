import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  CanvasRenderer,
]);

/** Tree-shaken ECharts core for users dashboard charts. */
export const USERS_ECHARTS_PROVIDERS = [
  provideEchartsCore({
    echarts: () => Promise.resolve(echarts),
  }),
];