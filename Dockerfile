# Use an official Ruby runtime as a parent image.
FROM ruby:3.2

# Install dependencies (build-essential for building gems with native extensions, PostgreSQL client, and Node.js)
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs

# Set an environment variable to store where our code will live inside the image.
WORKDIR /app

# Copy the Gemfile and Gemfile.lock into the image.
COPY Gemfile Gemfile.lock ./

# Install gems.
RUN bundle install

# Copy the rest of the application code.
COPY . .

# Expose port 3000 to be mapped to the host.
EXPOSE 3000

# The command to run the Rails server.
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
