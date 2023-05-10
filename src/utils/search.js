import React from 'react';
import { useState } from 'react';
import styled from 'styled-components';
const Search = ({ searchText, updateSearchTxt }) => {
  const [searchInput, setSearchTerm] = useState('');

  const handleChange = (e) => {
    if (e.target.value.length >= 0) {
      setSearchTerm(e.target.value);
    }
    updateSearchTxt(searchInput);
  };
  return (
    <>
      <div>
        <StyledInput className={'inputWithIcon'}>
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchText}
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
  background-color: ghostwhite;
  width: 100%;
  border: 1px solid #aaa;
  border-radius: 4px;
  margin: 0 auto;
  margin-top: 1rem;
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
    box-shadow: 5px 2px 7px 2px grey;
  }
`;

const StyledInput = styled.div`
  width: 100%;
  / &.inputWithIcon {
    position: relative;
  }
`;

export default Search;
