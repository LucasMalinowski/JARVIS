ARG RUBY_VERSION=3.2.2
ARG DISTRO_NAME=bullseye

FROM ruby:$RUBY_VERSION-slim-$DISTRO_NAME

ENV DEBIAN_FRONTEND=noninteractive
ENV RAILS_ENV=development
ENV NODE_MAJOR=20
ENV YARN_VERSION=1.22.19

# Common Dependencies
RUN apt-get update -qq && apt-get install -yq --no-install-recommends \
    build-essential \
    gnupg2 \
    curl \
    less \
    git \
    libvips \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install PostgreSQL dependencies
RUN curl -sSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgres-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/postgres-archive-keyring.gpg] https://apt.postgresql.org/pub/repos/apt/" bullseye-pgdg main 14 | tee /etc/apt/sources.list.d/postgres.list > /dev/null

RUN apt-get update -qq && apt-get install -yq --no-install-recommends \
    libpq-dev \
    postgresql-client-14 \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Add Node.js and install
RUN curl -sL https://deb.nodesource.com/setup_$NODE_MAJOR.x | bash - \
    && apt-get install -y --no-install-recommends \
    nodejs \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && npm install -g yarn@$YARN_VERSION

# Configure bundler
ENV LANG=C.UTF-8 \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3 \
    BUNDLE_APP_CONFIG=.bundle

# Upgrade RubyGems and install latest Bundler
RUN gem update --system && \
    gem install bundler foreman

# Create app directory
WORKDIR /app

# Copy application files
COPY . .

# Install dependencies
RUN bundle install

# Add entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
