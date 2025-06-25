import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom';

const Loading = () => {
  const {nextUrl} = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if(nextUrl){
      setTimeout(() => {
        navigate('/'+ nextUrl);
      }, 4000)
    }
  }, []);
  return (
    <div className='flex justify-center items-center h-[80vh]'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-t-primary'></div>
    </div>
  )
}

export default Loading