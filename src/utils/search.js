import React from 'react';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
const Search = ({ searchText, setUpdateSearchTerm }) => {
  const [searchInput, setSearchTerm] = useState('');

  const handleChange = (e) => {
    console.log(e.target.value);
    setSearchTerm(e.target.value);
    if (e >= 0) {
      setUpdateSearchTerm(e.target.value);
    }
  };
  return (
    <>
      <div>
        <StyledInput className={'inputWithIcon'}>
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={handleChange}
          />
        </StyledInput>
      </div>
    </>
  );
};
const SearchInput = styled.input`
  height: 3rem;
  font-size: 25px;
  width: 80%;
  border: 1px solid #aaa;
  border-radius: 4px;
  margin: 0 auto;
  outline: none;
  padding: 8px;
  box-sizing: border-box;
  transition: 0.5s;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 1.5rem;
  &:hover {
    /* border-color: black; */
    box-shadow: 5px 2px 7px 2px grey;
  }
`;

const StyledInput = styled.div`
  &.inputWithIcon {
    position: relative;
  }
`;

export default Search;
