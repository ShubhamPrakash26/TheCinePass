import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import Loading from '../components/Loading';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import isoTimeFormat from '../lib/isoTimeFormat';
import BlurCircle from '../components/BlurCircle';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';


const Seatlayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"], ["K", "L"], ["M", "N"]];
  const { id, date } = useParams();
  const [selectedSeat, setSelectedSeat] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const navigate = useNavigate();

  const { axios, getToken, user } = useAppContext();

  const getShow = async () => {
    try{
      const { data } = await axios.get(`/api/show/${id}`, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      if (data.success) {
        setShow({ movie: data.movie, dateTime: data.dateTime });
      }
      else {
        toast.error("Show not found.");
        navigate('/shows');
      }
    } catch (error) {
      console.error('Error fetching show:', error);
    }
  }

  const handleSeatClick = (seatId) => {
    if(!selectedTime){
      return toast.error("Please select a time slot first.");
    }
    if (!selectedSeat.includes(seatId) && selectedSeat.length > 4) {
      return toast.error("You can only select up to 5 seats.");
    }
    if(occupiedSeats.includes(seatId)){
      return toast.error("This seat is already booked.");
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
            className={`h-8 w-8 rounded border border-primary/60 cursor-pointer 
            ${selectedSeat.includes(seatId) && "bg-primary text-white"} 
            ${occupiedSeats.includes(seatId) && "opacity-50 cursor-not-allowed"}`}>
              {seatId}
            </button>
          )
        })}
      </div>
    </div>
  )

  const getOccupiedSeats = async () => {
    try{
      const {data} = await axios.get(`/api/booking/seats/${selectedTime.showId}`);

      if(data.success){
        setOccupiedSeats(data.occupiedSeats);
      } else{
        toast.error("Failed to fetch occupied seats.");
      }
    } catch(error){
      console.error('Error fetching occupied seats:', error);
    }
  }

  const bookTickets = async () => {
    try{
      if(!user){
        toast.error("Please login to book a ticket.");
        return navigate('/login');
      }
      if(!selectedTime|| !selectedSeat.length){
        return toast.error("Please select a time and at least one seat.");
      }
      const {data} = await axios.post('/api/booking/create', {showId: selectedTime.showId, selectedSeats: selectedSeat}, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      if(data.success){
        window.location.href = data.url;
      } else{
        toast.error(data.message || "Failed to book the ticket.");
      }
    } catch(error){
      toast.error(error.message || "An error occurred while booking the ticket.");
    }
  }

  useEffect(() => {
    if(user){
      getShow();
    }
  }, [user]);

  useEffect(() => {
    if(selectedTime){
      getOccupiedSeats();
    }
  }, [selectedTime])

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
          <button onClick={bookTickets} className='flex items gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95'>
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
