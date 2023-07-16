import { ResponsiveTimeRange } from '@nivo/calendar';
import styled from 'styled-components';
import { formattedDate, getCurrentDate } from '../utils/conversion';

const TimeRangeCalendar = (props) => {
  const accessToken = localStorage.getItem('access_token');
  let formatted = getCurrentDate();
  let date = formattedDate(formatted.currentDate.toISOString().split('T')[0]);

  const formattedData = props?.props.map((item) => {
    return {
      day: formattedDate(item.start_date),
      value: 0,
    };
  });

  const ThreeSixtyDaysAgo = new Date(
    formatted.currentYear,
    formatted.currentMonth,
    formatted.currentDay - 360
  );
  let formattedSixtyDaysAgo = ThreeSixtyDaysAgo.toISOString().split('T')[0];

  for (let i = 0; i < formattedData.length; i++) {
    for (let y = 1; y < formattedData.length; y++) {
      if (formattedData[i].day === formattedData[y].day) {
        formattedData[i].value = formattedData[i].value + 1;
      } else {
        formattedData[i].value = formattedData[i].value + 0;
      }
    }
  }
  return (
    accessToken && (
      <StyledCalendar>
        <h4 style={{ marginBottom: '-1rem', marginTop: '1rem', textAlign: 'center' }}>
          Activities
        </h4>
        <ResponsiveTimeRange
          data={formattedData}
          from={formattedSixtyDaysAgo}
          to={date}
          minValue={0}
          emptyColor="#eeeeee"
          colors={['#61cdbb', 'orange', '#e8c1a0', '#f47560']}
          margin={{ top: 40, right: 40, bottom: 10, left: 30 }}
          dayBorderWidth={2}
          dayBorderColor="#ffffff"
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'row',
              justify: false,
              itemCount: 5,
              itemWidth: 50,
              itemHeight: 50,
              itemsSpacing: 12,
              itemDirection: 'right-to-left',
              translateX: -60,
              translateY: -150,
              symbolSize: 10,
            },
          ]}
        />
      </StyledCalendar>
    )
  );
};

export default TimeRangeCalendar;

const StyledCalendar = styled.div`
  height: 35vh;
  width: 50vw;
  margin-left: 25rem;
  margin-bottom: -5rem;
  border: 1px solid #e6e6e6;
  box-shadow: 0px 0 5px #e6e6e6;

  @media screen and (max-width: 1000px) {
    margin-bottom: -11rem;
    margin-left: 20rem;
    border: 1px solid #e6e6e6;
    box-shadow: 0px 0 5px #e6e6e6;
  }

  @media screen and (max-width: 950px) {
    height: 35vh;
    width: 50vw;
    margin-bottom: -11rem;
    /* margin-left: 10rem; */
    border: 1px solid #e6e6e6;
    box-shadow: 0px 0 5px #e6e6e6;
  }

  @media screen and (max-width: 850px) {
    display: none;
  }
`;
