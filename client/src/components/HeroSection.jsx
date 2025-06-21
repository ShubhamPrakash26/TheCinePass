import React from 'react'
import { assets } from '../assets/assets'
import { ArrowRight, CalendarIcon, ClockIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
    const navigate = useNavigate()
  return (
    <div className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-cover bg-center h-screen bg-no-repeat bg-[url("/backgroundImage.png")]'>
      <img src={assets.marvelLogo} alt="" className='max-h-11 lg:h-11 mt-20'/>
      <h1 className='text-5xl md:text-[70px] md:leading-[80px] font-semibold max-w-110'>Guardian <br /> of the Galaxy</h1>
      <div className='flex items-center gap-4 text-gray-300'>
        <span>Action | Adventure | Science Fiction</span>
        <div className='flex items-center gap-1'>
          <CalendarIcon className='w-4 h-4' /> 2018
        </div>
        <div className='flex items-center gap-1'>
          <ClockIcon className='w-4 h-4' /> 2h 8m
        </div>
      </div>
      <p className='max-w-md text-gray-300'>
        In a post-apocalyptic world, a group of heroes must save the world from the menace known as the Quantum Realm. *Guardian of the Galaxy* is a 2018 American superhero film based on the Marvel Comics character the Guardians of the Galaxy.
      </p>
      <button className='flex item-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer' onClick={() => navigate('/movies')}>
        Explore Movies
        <ArrowRight className='w-5 h-5'/>
      </button>
    </div>
  )
}

export default HeroSection
