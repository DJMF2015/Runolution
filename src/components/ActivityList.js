import styled from 'styled-components';
export default function ActivityList({ pbElapsedTime, pbDistance }) {
  console.log(pbElapsedTime);
  console.log(pbDistance);
  return (
    <>
      <Container>
        <table>
          <tr>
            <th>Distance</th>
            <th>Time</th>
          </tr>
          <td> {pbDistance} kms </td>
          <td>{pbElapsedTime} mins</td>
        </table>
      </Container>
    </>
  );
}

const Container = styled.div`
  /* padding: 0% 10%; */
  /* display: grid; */
  /* grid-template-columns: repeat(2, minmax(1em, 1fr));
  background-color: #f2f2f2;
  grid-gap: 0.5rem;
  grid-template-rows: repeat(2, minmax(1em, 1fr)); */
  margin-top: 0.5em;
  border-radius: 5px;
  border: 1px solid black;
`;
