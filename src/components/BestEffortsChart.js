// import React from 'react';
// import styled from 'styled-components';
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
//   interaction: {
//     mode: 'index',
//     intersect: false,
//   },
//   plugins: {
//     legend: {
//       position: 'top',
//     },
//     title: {
//       display: true,
//       text: 'PaceZone',
//     },
//   },
//   scales: {
//     y: {
//       type: 'linear',
//       display: true,
//       position: 'left',
//     },
//     y1: {
//       type: 'linear',
//       display: true,
//       position: 'right',
//       grid: {
//         drawOnChartArea: true,
//       },
//     },
//   },
// };

// export default function PaceZoneChart(props) {
//   const heartRate = props.props.splits_standard
//     ? props.props.splits_standard.map((lap) => lap.average_heartrate)
//     : [];

//   const elevation = props.props.splits_standard
//     ? props.props.splits_standard.map((lap) => lap.elevation_difference)
//     : [];
//   const lapNameLabels = props.props.splits_standard
//     ? props.props.splits_standard.map((lap) => lap.split)
//     : [];

//   const average_watts = props.props.laps
//     ? props.props.laps.map((segment) => segment.average_watts)
//     : [];

//   const data = {
//     labels: lapNameLabels,

//     datasets: [
//       {
//         label: heartRate !== undefined ? 'Average Heartrate' : '',
//         data: heartRate,
//         borderColor: 'red',
//         color: 'red',
//         fill: true,
//         borderWidth: 3,
//         yAxisID: 'y', // Left y-axis
//       },
//       {
//         label: elevation !== undefined ? 'Elevation Difference' : '',
//         data: elevation,
//         fill: true,
//         borderColor: 'blue',
//         color: 'blue',
//         borderWidth: 2,
//         yAxisID: 'y1', // Right y-axis
//       },
//       {
//         label: average_watts !== undefined ? 'Average Watts' : '',
//         data: average_watts,
//         backgroundColor: [
//           'rgba(255, 99, 132, 0.2)',
//           'rgba(255, 159, 64, 0.2)',
//           'rgba(255, 205, 86, 0.2)',
//           'rgba(75, 192, 192, 0.2)',
//           'rgba(54, 162, 235, 0.2)',
//         ],
//         borderColor: [
//           'rgb(255, 99, 132)',
//           'rgb(255, 159, 64)',
//           'rgb(255, 205, 86)',
//           'rgb(75, 192, 192)',
//           'rgb(54, 162, 235)',
//         ],
//         borderWidth: 1,
//       },
//     ],
//   };

//   return (
//     <>
//       <ChartWrapper>
//         <div
//           style={{
//             marginTop: '6rem',
//           }}
//         >
//           <div className="chart" style={{ width: '50vw', height: '330px' }} />
//           <div
//             className="chart"
//             style={{
//               width: '50vw',
//               height: '300px',
//               display: 'flex',
//               position: 'relative',
//               left: '50vw',
//               bottom: '300px',
//             }}
//           >
//             <Line
//               data={data}
//               width={100}
//               height={100}
//               options={{ maintainAspectRatio: false }}
//             />
//           </div>
//         </div>
//       </ChartWrapper>
//     </>
//   );
// }
// const ChartWrapper = styled.div`
//   width: 100%;
//   height: 300px;

//   @media screen and (max-width: 600px) {
//     height: 260px;
//   }
// `;
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

const options = {
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
      ticks: {
        color: '#333',
        maxTicksLimit: 5,
      },
      grid: {
        color: '#eeeeee',
      },
      title: {
        display: true,
        text: 'Elapsed Time',
        color: '#333',
      },
    },
  },
};

export default function BestEffortsChart({ props }) {
  const bestEfforts = props?.best_efforts || [];
  if (!bestEfforts.length) {
    return <EmptyChart>No best efforts data available for this activity.</EmptyChart>;
  }

  const labels = bestEfforts.map((effort) => effort.name);

  const elapsedTimes = bestEfforts.map((effort) => {
    const mins = getSecondstoMinutes(effort.elapsed_time);
    return parseFloat(mins);
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Elapsed Time (mins)',
        data: elapsedTimes,
        fill: true,
        borderColor: '#fc5200',
        backgroundColor: 'rgba(252, 82, 0, 0.18)',
        pointBackgroundColor: '#fc5200',
        pointBorderColor: '#fc5200',
        tension: 0.35,
        borderWidth: 3,
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
