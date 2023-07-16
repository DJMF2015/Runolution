import React from 'react';
import { useState, useRef } from 'react';
import styled from 'styled-components';
const Search = ({ placeholder, updateSearchTxt }) => {
  const accessToken = localStorage.getItem('access_token');
  const [searchInput, setSearchTerm] = useState('');
  const ref = useRef();
  const handleChange = (e) => {
    if (ref.current !== searchInput) {
      setSearchTerm(ref.current.value);
    }
    updateSearchTxt(searchInput);
  };
  return (
    <>
      {accessToken && (
        <div>
          <StyledInput>
            <SearchInput
              type="text"
              ref={ref}
              placeholder={placeholder}
              value={searchInput}
              onChange={handleChange}
            />
          </StyledInput>
        </div>
      )}
    </>
  );
};
const SearchInput = styled.input`
  height: 3rem;
  font-size: 18px;
  background-color: ghostwhite;
  width: 50%;
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
  @media screen and (max-width: 990px) {
    display: flex;
    height: 2.5rem;
    margin: 0 auto;
    border: 1px solid #aaa;
    background-color: ghostwhite;
    cursor: pointer;
    border-radius: 4px;
    font-size: 18px;
    width: 65%;
    padding: 10px;
    margin-right: 1rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  @media screen and (max-width: 600px) {
    display: flex;
    height: 3rem;
    margin: 0 auto;
    border: 1px solid #aaa;
    background-color: ghostwhite;
    cursor: pointer;
    border-radius: 4px;
    font-size: 18px;
    width: 65%;
    padding: 8px;
    margin-top: 1rem;
    margin-bottom: 0rem;
  }
`;

const StyledInput = styled.div`
  width: 100%;
  &.inputWithIcon {
    position: relative;
  }
`;

export default Search;
