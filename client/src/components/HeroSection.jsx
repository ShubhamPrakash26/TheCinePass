import React from 'react'
import { assets } from '../assets/assets'
import { ArrowRight, CalendarIcon, ClockIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
  const navigate = useNavigate()

  return (
    <div className="relative h-screen bg-cover bg-center bg-no-repeat bg-[url('/backgroundImage.png')]">
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-1" />

      {/* Text and content */}
      <div className="relative z-10 flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 h-full text-white">
        <img src={assets.f1Logo} alt="F1 Logo" className="max-h-11 lg:h-11 mt-20" />
        <h1 className="text-5xl md:text-[70px] md:leading-[80px] font-extrabold drop-shadow-lg">
          Formula 1<br />The Pinnacle of Motorsport
        </h1>
        <div className="flex items-center gap-4 text-blue-200">
          <span>Sport | Documentary | Drama</span>
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" /> 2025
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" /> 2h 25m
          </div>
        </div>
        <p className="max-w-md text-gray-300 drop-shadow-sm">
          Formula 1 is more than just racing — it's a symphony of speed,
          engineering, and human ambition. Dive into the thrilling world
          of high-stakes motorsport, where milliseconds make champions and
          legends are forged on circuits around the globe.
        </p>
        <button
          className="flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer shadow-lg"
          onClick={() => navigate('/movies')}
        >
          Explore Movies
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default HeroSection
