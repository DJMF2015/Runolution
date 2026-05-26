// import React from 'react';
// import { getSecondstoMinutes } from '../utils/conversion';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   PointElement,
//   LineElement,
//   Filler,
//   Tooltip,
//   Legend,
// } from 'chart.js';
// import { Line } from 'react-chartjs-2';
// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler,
// );

// export const options = {
//   responsive: true,
//   maintainAspectRatio: false,
//   plugins: {
//     legend: {
//       position: 'bottom',
//       labels: {
//         color: '#111',
//       },
//     },
//     title: {
//       display: false,
//     },
//   },
//   scales: {
//     y: {
//       ticks: {
//         color: '#333',
//       },
//       grid: {
//         color: '#eeeeee',
//       },
//     },
//     y1: {
//       ticks: {
//         color: '#333',
//       },
//       grid: {
//         drawOnChartArea: false,
//       },
//     },
//     x: {
//       ticks: {
//         color: '#333',
//       },
//       grid: {
//         color: '#eeeeee',
//       },
//     },
//   },
// };

// export default function PaceZoneChart(props) {
//   const labelNames = props?.props?.best_efforts?.map((effort) => effort.name);

//   const elapsedTime = props.props.best_efforts
//     ? props.props.laps.map((effort) => effort.elapsed_time)
//     : [];
//   const formattedElapsedTime = elapsedTime
//     .map((time) => {
//       const mins = getSecondstoMinutes(time);

//       return parseFloat(mins);
//     })
//     .sort((a, b) => a - b);

//   const segment_efforts = props.props.segment_efforts
//     ? props.props.segment_efforts.map((segment) => segment.average_watts)
//     : [];
//   const data = {
//     labels: labelNames || [],

//     datasets: [
//       {
//         label: elapsedTime !== undefined ? 'Elapsed Time (mins)' : '',
//         data: formattedElapsedTime || [],
//         fill: true,
//         borderColor: 'rgb(53, 162, 235)',
//         backgroundColor: 'rgba(53, 162, 235, 0.5)',
//         borderWidth: 2,
//       },
//       {
//         label: elapsedTime !== undefined ? 'Average Watts (mins)' : '',
//         data: segment_efforts || [],
//         fill: true,
//         borderColor: 'rgb(53, 162, 235)',
//         backgroundColor: 'red',
//         borderWidth: 2,
//       },
//     ],
//   };

//   return (
//     <>
//       <div style={{ marginTop: '-630px', marginLeft: '10px' }}>
//         <div className="chart" style={{ width: '50vw', height: '330px' }}>
//           <Line width={75} height={50} data={data} options={options} />
//         </div>
//       </div>
//     </>
//   );
// }
import React from 'react';
import styled from 'styled-components';
import { getSecondstoMinutes } from '../utils/conversion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#111',
        boxWidth: 12,
        padding: 10,
        font: {
          size: 11,
        },
      },
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#333',
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        maxTicksLimit: 5,
      },
      grid: {
        color: '#eeeeee',
      },
    },
    y: {
      type: 'linear',
      position: 'left',
      ticks: {
        color: '#333',
        maxTicksLimit: 5,
      },
      grid: {
        color: '#eeeeee',
      },
      title: {
        display: true,
        text: 'Elapsed Time / Elevation',
        color: '#333',
      },
    },
    y1: {
      type: 'linear',
      position: 'right',
      ticks: {
        color: '#333',
        maxTicksLimit: 5,
      },
      grid: {
        drawOnChartArea: false,
      },
      title: {
        display: true,
        text: 'Watts',
        color: '#333',
      },
    },
  },
};

export default function ElevationBarChart({ props }) {
  const activity = props || {};

  const laps = activity?.laps || [];
  const splits = activity?.splits_standard || [];
  const segments = activity?.segment_efforts || [];

  const labels =
    splits.length > 0
      ? splits.map((split) => `Split ${split.split}`)
      : laps.map((lap, index) => `Lap ${lap.split || index + 1}`);

  const elapsedTimes = laps.map((lap) => {
    const mins = getSecondstoMinutes(lap.elapsed_time);
    return parseFloat(mins);
  });

  const elevation =
    splits.length > 0
      ? splits.map((split) => split.elevation_difference || 0)
      : laps.map((lap) => lap.total_elevation_gain || 0);

  const averageWatts =
    laps.length > 0
      ? laps.map((lap) => lap.average_watts || 0)
      : segments.map((segment) => segment.average_watts || 0);

  const hasData =
    labels.length > 0 ||
    elapsedTimes.length > 0 ||
    elevation.length > 0 ||
    averageWatts.length > 0;

  if (!hasData) {
    return <EmptyChart>No elevation data available for this activity.</EmptyChart>;
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Elapsed Time (mins)',
        data: elapsedTimes,
        fill: true,
        borderColor: '#fc5200',
        backgroundColor: 'rgba(252, 82, 0, 0.16)',
        pointBackgroundColor: '#fc5200',
        tension: 0.35,
        borderWidth: 3,
        yAxisID: 'y',
      },
      {
        label: 'Elevation Difference',
        data: elevation,
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointBackgroundColor: '#2563eb',
        tension: 0.35,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Average Watts',
        data: averageWatts,
        fill: false,
        borderColor: '#111827',
        backgroundColor: '#111827',
        pointBackgroundColor: '#111827',
        tension: 0.35,
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  return (
    <ChartWrapper>
      <Line data={data} options={options} />
    </ChartWrapper>
  );
}

const ChartWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  height: 300px;
  min-width: 0;
  position: relative;
  overflow: hidden;

  canvas {
    max-width: 100%;
  }

  @media screen and (max-width: 700px) {
    height: 250px;
  }

  @media screen and (max-width: 420px) {
    height: 230px;
  }
`;

const EmptyChart = styled.div`
  width: 100%;
  max-width: 100%;
  height: 300px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  text-align: center;
  color: #666;
  background: #fff;
  border-radius: 12px;

  @media screen and (max-width: 700px) {
    height: 250px;
  }
`;
