import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assets, dummyDateTimeData, dummyShowsData } from '../assets/assets';
import Loading from '../components/Loading';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import isoTimeFormat from '../lib/isoTimeFormat';
import BlurCircle from '../components/BlurCircle';
import toast from 'react-hot-toast';


const Seatlayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"], ["K", "L"], ["M", "N"]];
  const { id, date } = useParams();
  const [selectedSeat, setSelectedSeat] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const navigate = useNavigate();

  const getShow = async () => {
    const foundShow = dummyShowsData.find((show) => String(show._id) === String(id));
    if (foundShow) {
      setShow({
        movie: foundShow,
        dateTime: dummyDateTimeData,
      });
    } else {
      console.error("Show not found");
      setShow(false);
    }
  }

  const handleSeatClick = (seatId) => {
    if(!selectedTime){
      return toast.error("Please select a time slot first.");
    }
    if (!selectedSeat.includes(seatId) && selectedSeat.length > 4) {
      return toast.error("You can only select up to 5 seats.");
    }
    setSelectedSeat(prev => prev.includes(seatId) ? prev.filter(seat => seat !== seatId): [...prev, seatId]);
  }

  const renderSeats = (row, count=9) => (
    <div key={row} className='flex gap-2 mt-2'>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        {Array.from({length: count}, (_, index) => {
          const seatId = `${row}${index + 1}`;
          return (
            <button key={seatId} onClick={() => handleSeatClick(seatId)} 
            className={`h-8 w-8 rounded border border-primary/60 cursor-pointer ${selectedSeat.includes(seatId) && "bg-primary text-white"}`}>
              {seatId}
            </button>
          )
        })}
      </div>
    </div>
  )

  useEffect(() => {
    getShow();
  }, []);

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30'>
      {/* Available Timings */}
      <div className='w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold px-6'>Available Timings</p>
        <div className='mt-5 space-y-1'>
          {show.dateTime[date] ? (
            show.dateTime[date].map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 cursor-pointer w-max rounded-r-md transition ${
                  selectedTime?.time === item.time ? 'bg-primary text-white' : 'hover:bg-primary/20'
                }`}
              >
                <ClockIcon className='w-4 h-4' />
                <p className='text-sm'>{isoTimeFormat(item.time)}</p>
              </div>
            ))
          ) : (
            <p className='text-xs text-red-400 px-6'>No timings available for this date.</p>
          )}
        </div>
      </div>

      {/* Seat Layout */}
      <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
        <BlurCircle top='-100px' left='-100px' />
        <BlurCircle bottom='0px' right='0px' />
        <h1 className='text-2xl font-semibold mb-4'>Select Your Seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className='text-gray-400 text-sm mb-6'>SCREEN SIDE</p>
          <div className='flex flex-col items-center mt-10 text-xs text-gray-300'>
            <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
              {groupRows[0].map(row => renderSeats(row))}
            </div>
            <div className='grid grid-cols-2 gap-11'>
              {groupRows.slice(1).map((group, index) => (
                <div key={index} className='flex flex-col items-center'>
                  {group.map(row => renderSeats(row))}
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => navigate(`/mybookings`)} className='flex items gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95'>
            <ArrowRightIcon strokeWidth={3} className='h-4 w-4' />
            Proceed to Checkout
          </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Seatlayout;
