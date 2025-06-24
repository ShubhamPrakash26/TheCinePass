import React from 'react'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContext'

const Movies = () => {
  const { shows } = useAppContext()

  return shows.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 ld:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {shows
          // Optional: filter unique movies by ID to avoid showing duplicates
          .filter(
            (show, index, self) =>
              index === self.findIndex(s => s.movie._id === show.movie._id)
          )
          .map(show => (
            <MovieCard movie={show.movie} key={show._id} />
          ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-gray-700 text-center">
        No Movies Available
      </h1>
    </div>
  )
}

export default Movies
